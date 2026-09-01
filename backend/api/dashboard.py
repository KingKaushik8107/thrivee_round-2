from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from backend.database.database import get_db
from backend.database.models import (
    EmailRecord, AnalysisResult, IndicatorRecord, CampaignRecord
)

router = APIRouter(prefix="/dashboard", tags=["SOC Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Provides aggregated cybersecurity metrics, attack distribution charts, and recent incidents for the SOC dashboard.
    """
    total_emails = db.query(EmailRecord).count()
    campaign_count = db.query(CampaignRecord).count()

    # Verdict counts
    verdicts = db.query(AnalysisResult.verdict, func.count(AnalysisResult.id)).group_by(AnalysisResult.verdict).all()
    verdict_dist = {v[0]: v[1] for v in verdicts}

    crit_count = verdict_dist.get("critical_phishing", 0)
    phish_count = verdict_dist.get("phishing", 0)
    susp_count = verdict_dist.get("suspicious", 0)
    legit_count = verdict_dist.get("legitimate", 0)

    total_phishing = crit_count + phish_count
    phishing_pct = round((total_phishing / total_emails) * 100, 1) if total_emails > 0 else 0.0

    # Severity distribution from indicators
    sev_counts = db.query(IndicatorRecord.severity, func.count(IndicatorRecord.id)).group_by(IndicatorRecord.severity).all()
    sev_map = {s[0]: s[1] for s in sev_counts}

    # Attack types
    attacks = db.query(AnalysisResult.attack_type, func.count(AnalysisResult.id)).filter(AnalysisResult.attack_type.isnot(None)).group_by(AnalysisResult.attack_type).all()
    attack_dist = {a[0]: a[1] for a in attacks}

    # Top targeted brands
    brands = db.query(AnalysisResult.target_brand, func.count(AnalysisResult.id)).filter(AnalysisResult.target_brand.isnot(None)).group_by(AnalysisResult.target_brand).order_by(func.count(AnalysisResult.id).desc()).limit(6).all()
    top_brands = [{"brand": b[0], "count": b[1]} for b in brands]

    # Recent incidents
    recent_records = db.query(EmailRecord).join(AnalysisResult).order_by(EmailRecord.created_at.desc()).limit(8).all()
    recent_list = []
    for r in recent_records:
        recent_list.append({
            "id": r.id,
            "sender": r.sender,
            "subject": r.subject,
            "verdict": r.analysis.verdict if r.analysis else "unknown",
            "risk_score": r.analysis.risk_score if r.analysis else 0.0,
            "attack_type": r.analysis.attack_type if r.analysis else "generic_phishing",
            "target_brand": r.analysis.target_brand if r.analysis else None,
            "created_at": r.created_at.isoformat()
        })

    return {
        "total_analyzed": total_emails,
        "critical_count": crit_count,
        "high_count": phish_count,
        "medium_count": susp_count,
        "low_count": legit_count,
        "phishing_percentage": phishing_pct,
        "campaign_count": campaign_count,
        "verdict_distribution": {
            "critical_phishing": crit_count,
            "phishing": phish_count,
            "suspicious": susp_count,
            "legitimate": legit_count
        },
        "severity_distribution": sev_map,
        "attack_type_distribution": attack_dist,
        "top_brands": top_brands,
        "recent_incidents": recent_list
    }
