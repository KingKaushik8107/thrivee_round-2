import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.database.models import CampaignRecord, CampaignMember, EmailRecord, AnalysisResult
from backend.correlation.similarity import EmailSimilarityEngine
import tldextract

class CampaignManager:
    @classmethod
    def correlate_incident(
        cls,
        db: Session,
        email_record: EmailRecord,
        analysis_result: AnalysisResult
    ) -> Optional[CampaignRecord]:
        """
        Correlates a newly analyzed email against existing stored campaigns.
        Joins an existing campaign or instantiates a new campaign cluster if phishing signals match.
        """
        # If benign/legitimate, do not assign to a phishing campaign
        if analysis_result.verdict == "legitimate":
            return None

        # Build search attributes
        target_brand = analysis_result.target_brand or ""
        sender_domain = ""
        if email_record.sender and "@" in email_record.sender:
            sender_domain = email_record.sender.split("@")[-1].lower()

        urls = email_record.urls or []
        domains = set()
        if sender_domain:
            domains.add(sender_domain)
        for u in urls:
            ext = tldextract.extract(u)
            top_dom = getattr(ext, 'top_domain_under_public_suffix', None) or ext.registered_domain
            if top_dom:
                domains.add(top_dom.lower())

        # Check existing active campaigns
        campaigns = db.query(CampaignRecord).all()
        matched_campaign = None
        highest_sim = 0.0

        for camp in campaigns:
            shared_brands = (target_brand and camp.target_brand and target_brand.lower() == camp.target_brand.lower())
            
            # Check domain intersection
            camp_domains = set(camp.shared_domains or [])
            domain_overlap = bool(domains.intersection(camp_domains))

            # Check URL intersection
            camp_urls = set(camp.shared_urls or [])
            url_overlap = bool(set(urls).intersection(camp_urls))

            if shared_brands and (domain_overlap or url_overlap):
                matched_campaign = camp
                highest_sim = 0.92
                break

        # If no direct match, check text similarity against recent campaign members
        if not matched_campaign and campaigns:
            for camp in campaigns:
                if camp.members:
                    latest_member = camp.members[-1]
                    ref_email = latest_member.email
                    if ref_email:
                        sim_res = EmailSimilarityEngine.compute_similarity(
                            {
                                "sender": email_record.sender,
                                "subject": email_record.subject,
                                "body": email_record.body_text,
                                "target_brand": target_brand,
                                "urls": urls
                            },
                            {
                                "sender": ref_email.sender,
                                "subject": ref_email.subject,
                                "body": ref_email.body_text,
                                "target_brand": camp.target_brand,
                                "urls": ref_email.urls or []
                            }
                        )
                        if sim_res["is_related"] and sim_res["similarity_score"] > highest_sim:
                            highest_sim = sim_res["similarity_score"]
                            matched_campaign = camp

        if matched_campaign:
            # Add to existing campaign
            matched_campaign.email_count += 1
            if email_record.receiver and email_record.receiver not in (matched_campaign.notes or ""):
                matched_campaign.recipient_count += 1

            # Update shared domains & urls
            current_domains = set(matched_campaign.shared_domains or [])
            current_domains.update(domains)
            matched_campaign.shared_domains = list(current_domains)
            matched_campaign.domain_count = len(matched_campaign.shared_domains)

            current_urls = set(matched_campaign.shared_urls or [])
            current_urls.update(urls)
            matched_campaign.shared_urls = list(current_urls)
            matched_campaign.url_count = len(matched_campaign.shared_urls)

            matched_campaign.last_seen = datetime.now(timezone.utc)

            member = CampaignMember(
                campaign_id=matched_campaign.id,
                email_id=email_record.id,
                similarity_score=highest_sim
            )
            db.add(member)
            db.commit()
            return matched_campaign
        else:
            # Create a new campaign if it is high-confidence phishing
            if analysis_result.verdict in ["critical_phishing", "phishing"]:
                camp_id = f"CAMP-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
                camp_name = f"{target_brand or 'Targeted'} {analysis_result.attack_type.replace('_', ' ').title() if analysis_result.attack_type else 'Phishing'} Campaign"

                new_camp = CampaignRecord(
                    id=camp_id,
                    name=camp_name,
                    target_brand=target_brand or "Multiple Brands",
                    primary_attack_type=analysis_result.attack_type or "credential_harvesting",
                    status="active",
                    email_count=1,
                    recipient_count=1 if email_record.receiver else 0,
                    domain_count=len(domains),
                    url_count=len(urls),
                    first_seen=datetime.now(timezone.utc),
                    last_seen=datetime.now(timezone.utc),
                    shared_domains=list(domains),
                    shared_urls=list(urls),
                    shared_senders=[email_record.sender] if email_record.sender else [],
                    notes=f"Initial seed incident: {email_record.id}"
                )
                db.add(new_camp)
                db.commit()

                member = CampaignMember(
                    campaign_id=new_camp.id,
                    email_id=email_record.id,
                    similarity_score=1.0
                )
                db.add(member)
                db.commit()
                return new_camp

        return None

    @classmethod
    def generate_campaign_graph(cls, campaign: CampaignRecord, db: Session) -> Dict[str, Any]:
        """
        Constructs React Flow compatible nodes and edges representing the campaign attack graph.
        """
        nodes = []
        edges = []

        # 1. Central Campaign Node
        camp_node_id = f"camp-{campaign.id}"
        nodes.append({
            "id": camp_node_id,
            "type": "campaignNode",
            "position": {"x": 400, "y": 50},
            "data": {
                "label": campaign.name,
                "campaign_id": campaign.id,
                "target_brand": campaign.target_brand,
                "attack_type": campaign.primary_attack_type,
                "email_count": campaign.email_count,
                "status": campaign.status
            }
        })

        # 2. Target Brand Node
        if campaign.target_brand:
            brand_node_id = f"brand-{campaign.target_brand.replace(' ', '_')}"
            nodes.append({
                "id": brand_node_id,
                "type": "brandNode",
                "position": {"x": 400, "y": -80},
                "data": {
                    "label": f"Target Brand: {campaign.target_brand}",
                    "brand": campaign.target_brand
                }
            })
            edges.append({
                "id": f"e-{camp_node_id}-{brand_node_id}",
                "source": camp_node_id,
                "target": brand_node_id,
                "animated": True,
                "label": "impersonates"
            })

        # 3. Domain Nodes
        domains = campaign.shared_domains or []
        for idx, dom in enumerate(domains[:5]):
            dom_id = f"dom-{idx}-{dom.replace('.', '_')}"
            nodes.append({
                "id": dom_id,
                "type": "domainNode",
                "position": {"x": 100 + (idx * 160), "y": 220},
                "data": {
                    "label": dom,
                    "domain": dom
                }
            })
            edges.append({
                "id": f"e-{camp_node_id}-{dom_id}",
                "source": camp_node_id,
                "target": dom_id,
                "label": "uses infrastructure"
            })

        # 4. URL Nodes
        urls = campaign.shared_urls or []
        for idx, u in enumerate(urls[:4]):
            url_id = f"url-{idx}"
            display_u = u[:35] + "..." if len(u) > 35 else u
            nodes.append({
                "id": url_id,
                "type": "urlNode",
                "position": {"x": 150 + (idx * 180), "y": 380},
                "data": {
                    "label": display_u,
                    "full_url": u
                }
            })
            # Connect from nearest domain or campaign
            edges.append({
                "id": f"e-{camp_node_id}-{url_id}",
                "source": camp_node_id,
                "target": url_id,
                "label": "deploys link"
            })

        # 5. Email Incidents Nodes
        members = db.query(CampaignMember).filter(CampaignMember.campaign_id == campaign.id).limit(6).all()
        for idx, mem in enumerate(members):
            em = mem.email
            if em:
                em_node_id = f"email-{em.id[:8]}"
                subj_display = em.subject[:25] + "..." if (em.subject and len(em.subject) > 25) else (em.subject or "Email")
                nodes.append({
                    "id": em_node_id,
                    "type": "emailNode",
                    "position": {"x": 750, "y": 100 + (idx * 80)},
                    "data": {
                        "label": subj_display,
                        "email_id": em.id,
                        "sender": em.sender,
                        "subject": em.subject,
                        "similarity": mem.similarity_score
                    }
                })
                edges.append({
                    "id": f"e-{camp_node_id}-{em_node_id}",
                    "source": camp_node_id,
                    "target": em_node_id,
                    "label": f"{int(mem.similarity_score * 100)}% match"
                })

        return {"nodes": nodes, "edges": edges}
