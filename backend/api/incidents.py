from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.database.database import get_db
from backend.database.models import (
    EmailRecord, AnalysisResult, IndicatorRecord, IOCRecord, RiskBreakdownRecord,
    AnalystFeedbackRecord, CampaignMember
)
from backend.intelligence.ioc_extractor import IOCExtractor
from backend.reports import ReportGenerator, PDFReportGenerator
from backend.response.recommendations import ResponseRecommendationEngine
from backend.api.schemas import AnalystFeedbackRequest

router = APIRouter(prefix="/incidents", tags=["Incidents & Investigation"])

def format_incident_dict(email_rec: EmailRecord, db: Session) -> Dict[str, Any]:
    analysis = email_rec.analysis
    if not analysis:
        return {}

    indicators = [
        {
            "id": ind.id,
            "source": ind.source,
            "category": ind.category,
            "indicator_code": ind.indicator_code,
            "title": ind.title,
            "severity": ind.severity,
            "evidence": ind.evidence,
            "description": ind.description
        }
        for ind in analysis.indicators
    ]

    iocs_grouped = {"emails": [], "domains": [], "urls": [], "ips": [], "hashes": []}
    for ioc in analysis.iocs:
        t = ioc.ioc_type if ioc.ioc_type in iocs_grouped else "domains"
        iocs_grouped[t].append({
            "type": ioc.ioc_type,
            "value": ioc.value,
            "threat_intel_status": ioc.threat_intel_status,
            "reputation_score": ioc.reputation_score,
            "details": ioc.details
        })

    breakdown = {}
    if analysis.risk_breakdown:
        rb = analysis.risk_breakdown
        breakdown = {
            "ml": {"score": rb.ml_score, "max": 30.0},
            "domain_brand": {"score": rb.domain_brand_score, "max": 25.0},
            "url": {"score": rb.url_score, "max": 20.0},
            "sender": {"score": rb.sender_score, "max": 10.0},
            "content": {"score": rb.content_score, "max": 10.0},
            "threat_intel": {"score": rb.threat_intel_score, "max": 5.0}
        }

    # Find campaign membership if any
    camp_member = db.query(CampaignMember).filter(CampaignMember.email_id == email_rec.id).first()

    recommendations = ResponseRecommendationEngine.generate_recommendations(
        verdict=analysis.verdict,
        risk_score=analysis.risk_score,
        attack_type=analysis.attack_type or "generic_phishing",
        indicators=indicators,
        iocs=iocs_grouped
    )

    feedbacks = [
        {
            "id": f.id,
            "feedback": f.feedback,
            "analyst_name": f.analyst_name,
            "notes": f.notes,
            "created_at": f.created_at.isoformat()
        }
        for f in email_rec.feedbacks
    ]

    return {
        "id": email_rec.id,
        "incident_id": email_rec.id,
        "verdict": analysis.verdict,
        "risk_score": analysis.risk_score,
        "ml_probability": analysis.ml_probability,
        "attack_type": analysis.attack_type,
        "attack_type_confidence": analysis.attack_type_confidence,
        "target_brand": analysis.target_brand,
        "brand_similarity": analysis.brand_similarity,
        "summary": analysis.summary,
        "explanation": analysis.explanation,
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
            "urls": email_rec.urls or [],
            "attachments": email_rec.attachments_metadata or []
        },
        "indicators": indicators,
        "iocs": iocs_grouped,
        "breakdown": breakdown,
        "recommendations": recommendations,
        "campaign_id": camp_member.campaign_id if camp_member else None,
        "feedbacks": feedbacks,
        "created_at": email_rec.created_at.isoformat()
    }

@router.get("")
def list_incidents(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    verdict: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lists recent email investigation incidents with filtering and pagination.
    """
    query = db.query(EmailRecord).join(AnalysisResult)

    if verdict:
        query = query.filter(AnalysisResult.verdict == verdict)
    if search:
        s = f"%{search}%"
        query = query.filter((EmailRecord.subject.ilike(s)) | (EmailRecord.sender.ilike(s)))

    total = query.count()
    records = query.order_by(EmailRecord.created_at.desc()).offset(offset).limit(limit).all()

    incidents = []
    for r in records:
        analysis = r.analysis
        incidents.append({
            "id": r.id,
            "sender": r.sender,
            "subject": r.subject,
            "verdict": analysis.verdict if analysis else "unknown",
            "risk_score": analysis.risk_score if analysis else 0.0,
            "ml_probability": analysis.ml_probability if analysis else 0.0,
            "attack_type": analysis.attack_type if analysis else "generic_phishing",
            "target_brand": analysis.target_brand if analysis else None,
            "created_at": r.created_at.isoformat()
        })

    return {"total": total, "incidents": incidents}

@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieves full forensic details for a specific email investigation incident.
    """
    email_rec = db.query(EmailRecord).filter(EmailRecord.id == incident_id).first()
    if not email_rec:
        raise HTTPException(status_code=404, detail="Incident not found.")

    return format_incident_dict(email_rec, db)

@router.get("/{incident_id}/iocs")
def get_incident_iocs(
    incident_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """
    Exports IOCs for an incident in JSON or CSV format.
    """
    email_rec = db.query(EmailRecord).filter(EmailRecord.id == incident_id).first()
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident or IOCs not found.")

    iocs_dict = {"emails": [], "domains": [], "urls": [], "ips": [], "hashes": []}
    for ioc in email_rec.analysis.iocs:
        t = ioc.ioc_type if ioc.ioc_type in iocs_dict else "domains"
        iocs_dict[t].append({
            "type": ioc.ioc_type,
            "value": ioc.value,
            "threat_intel_status": ioc.threat_intel_status
        })

    if format == "csv":
        csv_data = IOCExtractor.export_to_csv(iocs_dict)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=iocs_{incident_id[:8]}.csv"}
        )

    return iocs_dict

@router.get("/{incident_id}/report")
def get_incident_report(
    incident_id: str,
    format: str = Query("html", pattern="^(html|pdf|json)$"),
    db: Session = Depends(get_db)
):
    """
    Generates and returns an incident report in HTML, PDF, or JSON format.
    """
    email_rec = db.query(EmailRecord).filter(EmailRecord.id == incident_id).first()
    if not email_rec:
        raise HTTPException(status_code=404, detail="Incident not found.")

    incident_dict = format_incident_dict(email_rec, db)

    if format == "json":
        json_report = ReportGenerator.generate_json_report(incident_dict)
        return json_report

    elif format == "html":
        html_report = ReportGenerator.generate_html_report(incident_dict)
        return HTMLResponse(content=html_report)

    elif format == "pdf":
        pdf_bytes = PDFReportGenerator.generate_pdf_bytes(incident_dict)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=incident_report_{incident_id[:8]}.pdf"}
        )

@router.post("/{incident_id}/feedback")
def submit_analyst_feedback(
    incident_id: str,
    payload: AnalystFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Records human SOC analyst validation feedback (Confirmed Phishing, False Positive, Needs Review).
    """
    email_rec = db.query(EmailRecord).filter(EmailRecord.id == incident_id).first()
    if not email_rec:
        raise HTTPException(status_code=404, detail="Incident not found.")

    feedback_rec = AnalystFeedbackRecord(
        email_id=incident_id,
        feedback=payload.feedback,
        analyst_name=payload.analyst_name or "SOC Analyst",
        notes=payload.notes or "",
        created_at=datetime.utcnow()
    )
    db.add(feedback_rec)
    db.commit()

    return {
        "status": "success",
        "message": f"Analyst feedback '{payload.feedback}' recorded successfully.",
        "feedback_id": feedback_rec.id
    }
