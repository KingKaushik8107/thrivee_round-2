from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid

from backend.database.database import get_db
from backend.database.models import (
    EmailRecord, AnalysisResult, IndicatorRecord, IOCRecord, RiskBreakdownRecord
)
from backend.parser.email_parser import EmailParser
from backend.analyzers import (
    SenderAnalyzer, DomainAnalyzer, BrandAnalyzer, URLAnalyzer, ContentAnalyzer, AttachmentAnalyzer, AttackTypeClassifier
)
from backend.intelligence import IOCExtractor, VirusTotalProvider, URLhausProvider, AbuseIPDBProvider
from backend.ml import predict_email
from backend.risk import HybridRiskEngine, RiskExplanationEngine
from backend.response.recommendations import ResponseRecommendationEngine
from backend.correlation.campaigns import CampaignManager
from backend.api.schemas import AnalyzeEmailRequest, AnalysisResponse

router = APIRouter(prefix="/analyze", tags=["Email Analysis"])

async def run_pipeline(parsed_email: Dict[str, Any], db: Session) -> Dict[str, Any]:
    # 1. Security Analyzers
    sender_indicators = SenderAnalyzer.analyze(parsed_email)

    # Sender domain analysis
    sender_domain = ""
    if parsed_email.get("sender") and "@" in parsed_email["sender"]:
        sender_domain = parsed_email["sender"].split("@")[-1].strip()
    domain_indicators = DomainAnalyzer.analyze_domain(sender_domain, "Sender Domain")

    # Brand Impersonation check
    brand_match, brand_indicators = BrandAnalyzer.analyze_domain(sender_domain)

    # URL Analysis & Destination Mismatch
    urls = parsed_email.get("urls", []) or []
    links = parsed_email.get("links", []) or []
    url_indicators = URLAnalyzer.analyze_urls(urls, links)

    # If brand not detected in sender, check destination URLs for brand lookalikes
    if not brand_match and urls:
        for u in urls:
            u_brand_match, u_brand_indicators = BrandAnalyzer.analyze_domain(u)
            if u_brand_match:
                brand_match = u_brand_match
                brand_indicators.extend(u_brand_indicators)
                break

    # Content & NLP Analysis
    content_indicators = ContentAnalyzer.analyze_content(
        subject=parsed_email.get("subject", ""),
        body=parsed_email.get("body", "")
    )

    # Attachment Analysis
    attachments = parsed_email.get("attachments", []) or []
    attachment_indicators = AttachmentAnalyzer.analyze_attachments(attachments)

    # Aggregate all forensic indicators
    all_indicators = (
        sender_indicators +
        domain_indicators +
        brand_indicators +
        url_indicators +
        content_indicators +
        attachment_indicators
    )

    # 2. Attack Type Classification
    attack_info = AttackTypeClassifier.classify(
        parsed_email=parsed_email,
        indicators=all_indicators,
        brand_match=brand_match
    )

    # 3. IOC Extraction
    iocs_dict = IOCExtractor.extract_iocs(parsed_email)

    # 4. Pluggable Threat Intelligence Lookups
    ti_results = []
    vt = VirusTotalProvider()
    uh = URLhausProvider()
    ab = AbuseIPDBProvider()

    # Query TI for top domain
    if sender_domain:
        ti_dom = await vt.lookup_ioc("domain", sender_domain)
        ti_results.append(ti_dom)

    # Query TI for top URL
    if urls:
        ti_url = await uh.lookup_ioc("url", urls[0])
        ti_results.append(ti_url)

    # Query TI for top IP
    if iocs_dict.get("ips"):
        top_ip = iocs_dict["ips"][0]["value"]
        ti_ip = await ab.lookup_ioc("ip", top_ip)
        ti_results.append(ti_ip)

    # Update IOC dictionary with threat intel statuses
    for ti in ti_results:
        ioc_val = ti.get("ioc_value", "")
        ioc_stat = ti.get("status", "unknown")
        for cat in iocs_dict:
            for item in iocs_dict[cat]:
                if item["value"] == ioc_val:
                    item["threat_intel_status"] = ioc_stat
                    item["reputation_score"] = ti.get("reputation_score")
                    item["details"] = ti.get("details")

    # 5. Machine Learning Prediction
    ml_result = predict_email(
        subject=parsed_email.get("subject", ""),
        body=parsed_email.get("body", ""),
        sender=parsed_email.get("sender", ""),
        urls=urls
    )
    ml_prob = ml_result.get("phishing_probability", 0.5)

    # 6. Hybrid Risk Scoring
    risk_output = HybridRiskEngine.calculate_risk(
        ml_prob=ml_prob,
        indicators=all_indicators,
        threat_intel_results=ti_results
    )
    risk_score = risk_output["risk_score"]
    verdict = risk_output["verdict"]
    breakdown = risk_output["breakdown"]

    # 7. Explainability Narrative Generation
    explanation_output = RiskExplanationEngine.generate_explanation(
        risk_score=risk_score,
        verdict=verdict,
        ml_prob=ml_prob,
        target_brand=brand_match.get("brand") if brand_match else "",
        attack_type=attack_info.get("attack_type", "generic_phishing"),
        indicators=all_indicators,
        breakdown=breakdown
    )

    # 8. SOC Response Playbook
    recommendations = ResponseRecommendationEngine.generate_recommendations(
        verdict=verdict,
        risk_score=risk_score,
        attack_type=attack_info.get("attack_type", "generic_phishing"),
        indicators=all_indicators,
        iocs=iocs_dict
    )

    # 9. Database Persistence
    email_rec = EmailRecord(
        raw_content=parsed_email.get("raw_content", ""),
        sender=parsed_email.get("sender", ""),
        reply_to=parsed_email.get("reply_to", ""),
        display_name=parsed_email.get("display_name", ""),
        receiver=parsed_email.get("receiver", ""),
        subject=parsed_email.get("subject", ""),
        date_header=parsed_email.get("date", ""),
        message_id=parsed_email.get("message_id", ""),
        body_text=parsed_email.get("body", ""),
        body_html=parsed_email.get("html", ""),
        headers=parsed_email.get("headers", {}),
        urls=urls,
        attachments_metadata=attachments,
        created_at=datetime.now(timezone.utc)
    )
    db.add(email_rec)
    db.flush()

    analysis_rec = AnalysisResult(
        email_id=email_rec.id,
        verdict=verdict,
        risk_score=risk_score,
        ml_probability=ml_prob,
        attack_type=attack_info.get("attack_type", "generic_phishing"),
        attack_type_confidence=attack_info.get("confidence", 0.8),
        target_brand=brand_match.get("brand") if brand_match else None,
        brand_similarity=brand_match.get("similarity") if brand_match else None,
        summary=explanation_output.get("executive_summary", ""),
        explanation=explanation_output.get("structured_explanation", ""),
        created_at=datetime.now(timezone.utc)
    )
    db.add(analysis_rec)
    db.flush()

    # Save indicators
    for ind in all_indicators:
        db.add(IndicatorRecord(
            analysis_id=analysis_rec.id,
            source=ind.get("source", "generic"),
            category=ind.get("category", "general"),
            indicator_code=ind.get("indicator_code", "GENERIC_FLAG"),
            title=ind.get("title", ""),
            severity=ind.get("severity", "low"),
            evidence=ind.get("evidence", ""),
            description=ind.get("description", ""),
            created_at=datetime.now(timezone.utc)
        ))

    # Save IOCs
    for cat, items in iocs_dict.items():
        for item in items:
            db.add(IOCRecord(
                analysis_id=analysis_rec.id,
                ioc_type=item.get("type", cat),
                value=item.get("value", ""),
                threat_intel_status=item.get("threat_intel_status", "unknown"),
                reputation_score=item.get("reputation_score"),
                details=item.get("details"),
                created_at=datetime.now(timezone.utc)
            ))

    # Save Risk Breakdown
    db.add(RiskBreakdownRecord(
        analysis_id=analysis_rec.id,
        ml_score=breakdown["ml"]["score"],
        domain_brand_score=breakdown["domain_brand"]["score"],
        url_score=breakdown["url"]["score"],
        sender_score=breakdown["sender"]["score"],
        content_score=breakdown["content"]["score"],
        threat_intel_score=breakdown["threat_intel"]["score"],
        total_score=risk_score,
        weights=risk_output["weights"],
        details=breakdown
    ))

    # Correlate Campaign
    camp = CampaignManager.correlate_incident(db, email_rec, analysis_rec)
    db.commit()

    return {
        "incident_id": email_rec.id,
        "verdict": verdict,
        "risk_score": risk_score,
        "ml_probability": ml_prob,
        "attack_type": attack_info.get("attack_type", "generic_phishing"),
        "attack_type_confidence": attack_info.get("confidence", 0.8),
        "target_brand": brand_match.get("brand") if brand_match else None,
        "brand_similarity": brand_match.get("similarity") if brand_match else None,
        "summary": explanation_output.get("executive_summary", ""),
        "explanation": explanation_output.get("structured_explanation", ""),
        "email": {
            "id": email_rec.id,
            "sender": email_rec.sender,
            "display_name": email_rec.display_name,
            "reply_to": email_rec.reply_to,
            "receiver": email_rec.receiver,
            "subject": email_rec.subject,
            "date": email_rec.date_header,
            "message_id": email_rec.message_id,
            "body": email_rec.body_text,
            "urls": urls,
            "attachments": attachments
        },
        "indicators": all_indicators,
        "iocs": iocs_dict,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "campaign_id": camp.id if camp else None,
        "created_at": email_rec.created_at.isoformat()
    }

@router.post("", response_model=Dict[str, Any])
async def analyze_email(payload: AnalyzeEmailRequest, db: Session = Depends(get_db)):
    """
    Ingests and performs full forensic and ML analysis on an email (raw text or structured JSON).
    """
    if payload.raw_content:
        parsed = EmailParser.parse_raw_email(payload.raw_content)
    else:
        # Construct synthetic raw content
        raw_synthetic = f"From: {payload.sender}\nTo: {payload.receiver}\nSubject: {payload.subject}\n\n{payload.body}"
        parsed = {
            "sender": payload.sender,
            "reply_to": payload.reply_to,
            "display_name": "",
            "receiver": payload.receiver,
            "subject": payload.subject,
            "date": "",
            "message_id": "",
            "body": payload.body or "",
            "html": "",
            "headers": payload.headers or {},
            "urls": payload.urls or EmailParser._extract_urls(payload.body or "", [], raw_synthetic),
            "links": [],
            "attachments": [],
            "raw_content": raw_synthetic
        }

    return await run_pipeline(parsed, db)

@router.post("/upload", response_model=Dict[str, Any])
async def analyze_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded .eml or .txt email file for investigation.
    """
    # Max file size limit: 10 MB
    content_bytes = await file.read()
    if len(content_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowable limit (10MB).")

    parsed = EmailParser.parse_bytes(content_bytes)
    return await run_pipeline(parsed, db)
