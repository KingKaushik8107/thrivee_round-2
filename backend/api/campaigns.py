from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from backend.database.database import get_db
from backend.database.models import CampaignRecord, CampaignMember
from backend.correlation.campaigns import CampaignManager

router = APIRouter(prefix="/campaigns", tags=["Phishing Campaigns"])

@router.get("")
def list_campaigns(db: Session = Depends(get_db)):
    """
    Returns all active and archived phishing campaigns with correlation statistics.
    """
    campaigns = db.query(CampaignRecord).order_by(CampaignRecord.last_seen.desc()).all()
    results = []

    for c in campaigns:
        results.append({
            "id": c.id,
            "name": c.name,
            "target_brand": c.target_brand,
            "primary_attack_type": c.primary_attack_type,
            "status": c.status,
            "email_count": c.email_count,
            "recipient_count": c.recipient_count,
            "domain_count": c.domain_count,
            "url_count": c.url_count,
            "shared_domains": c.shared_domains or [],
            "shared_urls": c.shared_urls or [],
            "first_seen": c.first_seen.isoformat(),
            "last_seen": c.last_seen.isoformat()
        })

    return {"total": len(results), "campaigns": results}

@router.get("/{campaign_id}")
def get_campaign_detail(campaign_id: str, db: Session = Depends(get_db)):
    """
    Retrieves full details for a campaign including member incident listings and React Flow attack graph.
    """
    camp = db.query(CampaignRecord).filter(CampaignRecord.id == campaign_id).first()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    # Generate React Flow graph
    graph = CampaignManager.generate_campaign_graph(camp, db)

    # Get members
    members = []
    for m in camp.members:
        em = m.email
        if em:
            members.append({
                "email_id": em.id,
                "sender": em.sender,
                "subject": em.subject,
                "verdict": em.analysis.verdict if em.analysis else "unknown",
                "risk_score": em.analysis.risk_score if em.analysis else 0.0,
                "similarity_score": m.similarity_score,
                "created_at": em.created_at.isoformat()
            })

    return {
        "id": camp.id,
        "name": camp.name,
        "target_brand": camp.target_brand,
        "primary_attack_type": camp.primary_attack_type,
        "status": camp.status,
        "email_count": camp.email_count,
        "recipient_count": camp.recipient_count,
        "domain_count": camp.domain_count,
        "url_count": camp.url_count,
        "shared_domains": camp.shared_domains or [],
        "shared_urls": camp.shared_urls or [],
        "shared_senders": camp.shared_senders or [],
        "first_seen": camp.first_seen.isoformat(),
        "last_seen": camp.last_seen.isoformat(),
        "members": members,
        "graph": graph
    }
