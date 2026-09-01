from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database.database import get_db
from backend.database.models import EmailRecord
from backend.ai.analyst import AISecurityAnalyst
from backend.api.schemas import AIExplainRequest
from backend.api.incidents import format_incident_dict

router = APIRouter(prefix="/ai", tags=["AI Security Analyst"])

@router.post("/explain")
async def explain_incident(
    payload: AIExplainRequest,
    db: Session = Depends(get_db)
):
    """
    Answers analyst inquiries using strictly grounded forensic findings.
    """
    findings = payload.structured_findings

    # If incident_id is passed and findings not directly supplied, fetch from DB
    if not findings and payload.incident_id:
        email_rec = db.query(EmailRecord).filter(EmailRecord.id == payload.incident_id).first()
        if email_rec:
            findings = format_incident_dict(email_rec, db)

    if not findings:
        findings = {
            "verdict": "unknown",
            "risk_score": 0.0,
            "ml_probability": 0.0,
            "indicators": [],
            "iocs": {}
        }

    response = await AISecurityAnalyst.explain_incident(
        question=payload.question,
        structured_findings=findings,
        history=payload.history
    )

    return response
