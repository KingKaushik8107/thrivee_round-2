import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from backend.database.database import SessionLocal, init_db
from backend.database.models import EmailRecord, CampaignRecord
from backend.api.demo import DEMO_SCENARIOS
from backend.api.analyze import run_pipeline

async def seed_database():
    print("[+] Initializing database tables...")
    init_db()
    db: Session = SessionLocal()

    # Check if database already has incidents
    existing = db.query(EmailRecord).count()
    if existing > 0:
        print(f"[OK] Database already populated with {existing} incidents.")
        db.close()
        return

    print("[+] Seeding realistic SOC demo incidents and campaign clusters...")
    for idx, scenario in enumerate(DEMO_SCENARIOS):
        parsed = {
            "sender": scenario["sender"],
            "reply_to": scenario.get("reply_to", ""),
            "display_name": scenario.get("display_name", ""),
            "receiver": f"victim_{idx+1}@enterprise.com",
            "subject": scenario["subject"],
            "date": (datetime.now(timezone.utc) - timedelta(hours=(idx*3 + 1))).strftime("%a, %d %b %Y %H:%M:%S +0000"),
            "message_id": f"<msg-{idx+100}-soc@domain.com>",
            "body": scenario["body"],
            "html": f"<p>{scenario['body']}</p>",
            "headers": {
                "From": f"{scenario.get('display_name', '')} <{scenario['sender']}>",
                "Subject": scenario["subject"],
                "Date": datetime.now(timezone.utc).isoformat()
            },
            "urls": scenario.get("urls", []),
            "links": [{"text": "Click Here", "url": u} for u in scenario.get("urls", [])],
            "attachments": scenario.get("attachments", []),
            "raw_content": f"From: {scenario['sender']}\nSubject: {scenario['subject']}\n\n{scenario['body']}"
        }

        try:
            res = await run_pipeline(parsed, db)
            print(f"  [OK] Seeded incident {idx+1}: '{scenario['subject'][:35]}...' -> {res['verdict']} ({res['risk_score']}/100)")
        except Exception as e:
            print(f"  [!] Error seeding incident {idx+1}: {e}")

    # Ensure a rich campaign cluster exists (e.g. CAMP-001)
    camp = db.query(CampaignRecord).first()
    if camp:
        camp.id = "CAMP-2026-001"
        camp.name = "Global PayPal Credential Harvesting Campaign"
        camp.target_brand = "PayPal"
        camp.primary_attack_type = "credential_harvesting"
        camp.email_count = 27
        camp.recipient_count = 19
        camp.domain_count = 3
        camp.url_count = 8
        camp.shared_domains = ["paypa1-login.com", "paypal-security-auth.net", "py-pal-secure.live"]
        camp.shared_urls = ["http://paypa1-login.com/verify", "http://paypal-security-auth.net/signin", "http://py-pal-secure.live/auth"]
        camp.notes = "Coordinated credential harvesting campaign targeting enterprise finance and HR departments using lookalike domain typosquatting."
        db.commit()

    print("[OK] Database seeding complete.")
    db.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
