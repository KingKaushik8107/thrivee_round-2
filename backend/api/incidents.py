from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.database.database import get_db
from backend.database.models import (
    EmailRecord, AnalysisResult, IndicatorRecord, IOCRecord, RiskBreakdownRecord,
    AnalystFeedbackRecord, CampaignMember, AnalystNoteRecord, IncidentTimelineEventRecord
)
from backend.intelligence.ioc_extractor import IOCExtractor
from backend.ml import explain_email
from backend.reports import ReportGenerator, PDFReportGenerator
from backend.response.recommendations import ResponseRecommendationEngine
from backend.risk import UnifiedXAIEngine
from backend.api.schemas import (
    AnalystFeedbackRequest, IncidentStatusUpdate, AnalystNoteCreate,
    AnalystNoteDTO, IncidentTimelineEventDTO
)


router = APIRouter(prefix="/incidents", tags=["Incidents & Investigation"])

def resolve_incident(incident_id: str, db: Session) -> Optional[EmailRecord]:
    """
    Resolves an EmailRecord (incident) using canonical identifiers:
    1. Direct EmailRecord.id (exact match)
    2. Stripped 'INC-' prefix (e.g. 'INC-b239aa65-...' or 'INC-B239AA65')
    3. Direct AnalysisResult.id (exact match)
    4. Short prefix match on EmailRecord.id (>= 6 chars)
    """
    if not incident_id:
        return None

    clean_id = incident_id.strip()

    # 1. Exact match on EmailRecord.id
    rec = db.query(EmailRecord).filter(EmailRecord.id == clean_id).first()
    if rec:
        return rec

    # 2. Check if clean_id starts with 'INC-'
    if clean_id.upper().startswith("INC-"):
        stripped = clean_id[4:].strip()
        rec = db.query(EmailRecord).filter(EmailRecord.id == stripped).first()
        if rec:
            return rec
        if len(stripped) >= 6:
            rec = db.query(EmailRecord).filter(EmailRecord.id.ilike(f"{stripped}%")).first()
            if rec:
                return rec

    # 3. Exact match on AnalysisResult.id
    analysis_rec = db.query(AnalysisResult).filter(AnalysisResult.id == clean_id).first()
    if analysis_rec and analysis_rec.email:
        return analysis_rec.email

    # 4. Short prefix match on EmailRecord.id
    if len(clean_id) >= 6:
        rec = db.query(EmailRecord).filter(EmailRecord.id.ilike(f"{clean_id}%")).first()
        if rec:
            return rec

    return None

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

    notes = [
        {
            "id": n.id,
            "analysis_id": n.analysis_id,
            "analyst_name": n.analyst_name,
            "note_text": n.note_text,
            "created_at": n.created_at.isoformat()
        }
        for n in getattr(analysis, "analyst_notes", [])
    ]
    notes.sort(key=lambda x: x["created_at"], reverse=True)

    timeline = [
        {
            "id": t.id,
            "analysis_id": t.analysis_id,
            "event_type": t.event_type,
            "title": t.title,
            "description": t.description,
            "actor": t.actor,
            "created_at": t.created_at.isoformat()
        }
        for t in getattr(analysis, "timeline_events", [])
    ]
    timeline.sort(key=lambda x: x["created_at"])

    # Synthesize unified XAI on the fly for incident review
    xai_res = explain_email(
        subject=email_rec.subject or "",
        body=email_rec.body_text or "",
        sender=email_rec.sender or "",
        urls=email_rec.urls or []
    )
    unified_xai = UnifiedXAIEngine.build_explanation(
        ml_xai=xai_res.get("xai"),
        forensic_indicators=indicators,
        threat_intel_results=[
            {
                "ioc_type": ioc.ioc_type,
                "ioc_value": ioc.value,
                "status": ioc.threat_intel_status,
                "reputation_score": ioc.reputation_score,
                "details": ioc.details
            }
            for ioc in analysis.iocs
        ],
        risk_score=analysis.risk_score,
        attack_type=analysis.attack_type,
        target_brand=analysis.target_brand,
        verdict=analysis.verdict
    )

    return {
        "id": email_rec.id,
        "incident_id": email_rec.id,
        "verdict": analysis.verdict,
        "risk_score": analysis.risk_score,
        "ml_probability": analysis.ml_probability,
        "status": getattr(analysis, "status", "new") or "new",
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
        "created_at": email_rec.created_at.isoformat(),
        "xai": unified_xai,
        "notes": notes,
        "timeline": timeline
    }


@router.get("")
def list_incidents(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    verdict: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lists recent email investigation incidents with filtering and pagination.
    """
    query = db.query(EmailRecord).join(AnalysisResult)

    if verdict:
        query = query.filter(AnalysisResult.verdict == verdict)
    if status:
        query = query.filter(AnalysisResult.status == status)
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
            "status": analysis.status if analysis and analysis.status else "new",
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
    email_rec = resolve_incident(incident_id, db)
    if not email_rec:
        raise HTTPException(status_code=404, detail="Incident not found.")

    return format_incident_dict(email_rec, db)

@router.patch("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the incident workflow status (new, investigating, confirmed_threat, false_positive, resolved).
    """
    email_rec = resolve_incident(incident_id, db)
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident not found.")

    old_status = email_rec.analysis.status or "new"
    email_rec.analysis.status = payload.status

    # Record timeline audit event
    timeline_rec = IncidentTimelineEventRecord(
        analysis_id=email_rec.analysis.id,
        event_type="status_change",
        title=f"Status Updated: {payload.status.upper().replace('_', ' ')}",
        description=payload.reason if payload.reason else f"Status changed from '{old_status}' to '{payload.status}' by {payload.analyst_name}.",
        actor=payload.analyst_name or "SOC Analyst",
        created_at=datetime.now(timezone.utc)
    )
    db.add(timeline_rec)
    db.commit()

    return {
        "status": "success",
        "incident_id": email_rec.id,
        "old_status": old_status,
        "new_status": payload.status,
        "message": f"Incident status updated to '{payload.status}' successfully."
    }

@router.get("/{incident_id}/notes", response_model=List[AnalystNoteDTO])
def get_incident_notes(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieves all investigation notes recorded for an incident.
    """
    email_rec = resolve_incident(incident_id, db)
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident not found.")

    notes = (
        db.query(AnalystNoteRecord)
        .filter(AnalystNoteRecord.analysis_id == email_rec.analysis.id)
        .order_by(AnalystNoteRecord.created_at.desc())
        .all()
    )
    return [
        AnalystNoteDTO(
            id=n.id,
            analysis_id=n.analysis_id,
            analyst_name=n.analyst_name,
            note_text=n.note_text,
            created_at=n.created_at.isoformat()
        )
        for n in notes
    ]

@router.post("/{incident_id}/notes", response_model=AnalystNoteDTO, status_code=201)
def add_incident_note(
    incident_id: str,
    payload: AnalystNoteCreate,
    db: Session = Depends(get_db)
):
    """
    Appends a new analyst investigation note and audit log entry.
    """
    email_rec = resolve_incident(incident_id, db)
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident not found.")

    note_rec = AnalystNoteRecord(
        analysis_id=email_rec.analysis.id,
        analyst_name=payload.analyst_name or "SOC Analyst",
        note_text=payload.note_text.strip(),
        created_at=datetime.now(timezone.utc)
    )
    db.add(note_rec)
    db.flush()

    # Add timeline event
    desc_preview = payload.note_text.strip()
    if len(desc_preview) > 140:
        desc_preview = desc_preview[:137] + "..."
    timeline_rec = IncidentTimelineEventRecord(
        analysis_id=email_rec.analysis.id,
        event_type="analyst_note",
        title=f"Analyst Note Added by {payload.analyst_name}",
        description=desc_preview,
        actor=payload.analyst_name or "SOC Analyst",
        created_at=datetime.now(timezone.utc)
    )
    db.add(timeline_rec)
    db.commit()

    return AnalystNoteDTO(
        id=note_rec.id,
        analysis_id=note_rec.analysis_id,
        analyst_name=note_rec.analyst_name,
        note_text=note_rec.note_text,
        created_at=note_rec.created_at.isoformat()
    )

@router.delete("/{incident_id}/notes/{note_id}")
def delete_incident_note(
    incident_id: str,
    note_id: str,
    db: Session = Depends(get_db)
):
    """
    Securely deletes a specific analyst investigation note.
    """
    email_rec = resolve_incident(incident_id, db)
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident not found.")

    note_rec = (
        db.query(AnalystNoteRecord)
        .filter(
            AnalystNoteRecord.id == note_id,
            AnalystNoteRecord.analysis_id == email_rec.analysis.id
        )
        .first()
    )

    if not note_rec:
        # Check if note exists under a different incident to provide explicit security feedback
        other_note = db.query(AnalystNoteRecord).filter(AnalystNoteRecord.id == note_id).first()
        if other_note:
            raise HTTPException(status_code=400, detail="Note does not belong to the specified incident.")
        raise HTTPException(status_code=404, detail="Analyst note not found.")

    db.delete(note_rec)
    db.commit()

    return {
        "status": "success",
        "message": f"Analyst note '{note_id}' successfully removed.",
        "incident_id": email_rec.id,
        "note_id": note_id
    }

@router.get("/{incident_id}/timeline", response_model=List[IncidentTimelineEventDTO])
def get_incident_timeline(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieves chronological investigation timeline events for an incident.
    """
    email_rec = resolve_incident(incident_id, db)
    if not email_rec or not email_rec.analysis:
        raise HTTPException(status_code=404, detail="Incident not found.")

    events = (
        db.query(IncidentTimelineEventRecord)
        .filter(IncidentTimelineEventRecord.analysis_id == email_rec.analysis.id)
        .order_by(IncidentTimelineEventRecord.created_at.asc())
        .all()
    )
    return [
        IncidentTimelineEventDTO(
            id=e.id,
            analysis_id=e.analysis_id,
            event_type=e.event_type,
            title=e.title,
            description=e.description,
            actor=e.actor,
            created_at=e.created_at.isoformat()
        )
        for e in events
    ]

@router.get("/{incident_id}/iocs")
def get_incident_iocs(
    incident_id: str,
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db)
):
    """
    Exports IOCs for an incident in JSON or CSV format.
    """
    email_rec = resolve_incident(incident_id, db)
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
            headers={"Content-Disposition": f"attachment; filename=iocs_{email_rec.id[:8]}.csv"}
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
    email_rec = resolve_incident(incident_id, db)
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
            headers={"Content-Disposition": f"attachment; filename=incident_report_{email_rec.id[:8]}.pdf"}
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
    email_rec = resolve_incident(incident_id, db)
    if not email_rec:
        raise HTTPException(status_code=404, detail="Incident not found.")

    feedback_rec = AnalystFeedbackRecord(
        email_id=email_rec.id,
        feedback=payload.feedback,
        analyst_name=payload.analyst_name or "SOC Analyst",
        notes=payload.notes or "",
        created_at=datetime.now(timezone.utc)
    )
    db.add(feedback_rec)

    # Add timeline event for analyst feedback
    if email_rec.analysis:
        fb_label = payload.feedback.replace("_", " ").title()
        timeline_rec = IncidentTimelineEventRecord(
            analysis_id=email_rec.analysis.id,
            event_type="feedback",
            title=f"Analyst Decision: {fb_label}",
            description=f"Analyst feedback '{payload.feedback}' recorded. Notes: {payload.notes or 'None'}",
            actor=payload.analyst_name or "SOC Analyst",
            created_at=datetime.now(timezone.utc)
        )
        db.add(timeline_rec)

    db.commit()

    return {
        "status": "success",
        "message": f"Analyst feedback '{payload.feedback}' recorded successfully.",
        "feedback_id": feedback_rec.id
    }


