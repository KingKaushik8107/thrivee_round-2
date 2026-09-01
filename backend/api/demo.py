from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/demo", tags=["Demo Scenarios"])

DEMO_SCENARIOS = [
    {
        "id": "scenario-1-paypal",
        "name": "1. Master Demo: PayPal Impersonation & Lookalike Domain",
        "category": "Critical Phishing",
        "sender": "security@paypa1-login.com",
        "display_name": "PayPal Security Team",
        "subject": "Your account will be suspended!",
        "body": "Dear Customer,\n\nYour PayPal account has been flagged for suspicious transactions. You must verify your account immediately within 24 hours to prevent permanent account suspension.\n\nClick below to confirm your credentials:\nhttp://paypa1-login.com/verify\n\nFailure to comply will result in account termination.\n\nSincerely,\nPayPal Fraud Prevention Team",
        "urls": ["http://paypa1-login.com/verify"],
        "expected_brand": "PayPal",
        "expected_attack": "Credential Harvesting",
        "expected_score": 92
    },
    {
        "id": "scenario-2-microsoft",
        "name": "2. Microsoft 365 Password Expiration (Credential Theft)",
        "category": "Critical Phishing",
        "sender": "it-admin@microsoft-sso-portal.xyz",
        "display_name": "Microsoft 365 Global Admin",
        "subject": "Urgent: Your Microsoft 365 Password Expires in 2 Hours",
        "body": "Notice to employee: Your corporate Single-Sign-On password expires today. To retain your current password and prevent email access termination, authenticate immediately via the secure portal below.\n\nSign in here: http://microsoft-sso-portal.xyz/auth/login\n\nIT Support Desk",
        "urls": ["http://microsoft-sso-portal.xyz/auth/login"],
        "expected_brand": "Microsoft",
        "expected_attack": "Credential Harvesting",
        "expected_score": 90
    },
    {
        "id": "scenario-3-invoice-malware",
        "name": "3. Weaponized Double-Extension Malware (Invoice.pdf.exe)",
        "category": "Critical Malware",
        "sender": "billing-dept@freight-invoicing.top",
        "display_name": "Accounts Payable",
        "subject": "Overdue Remittance Advice INV-2026-9812 - Immediate Action",
        "body": "Please find attached the official remittance advice and billing statement for Q3 logistics services. Review the attached document immediately to avoid interest penalties.\n\nAttachment: invoice_remittance_2026.pdf.exe",
        "urls": [],
        "attachments": [
            {
                "filename": "invoice_remittance_2026.pdf.exe",
                "extension": "exe",
                "content_type": "application/x-dosexec",
                "size_bytes": 482910,
                "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            }
        ],
        "expected_brand": None,
        "expected_attack": "Malware Delivery",
        "expected_score": 94
    },
    {
        "id": "scenario-4-bec-wire",
        "name": "4. Business Email Compromise (CEO Urgent Wire Request)",
        "category": "High Phishing (BEC)",
        "sender": "ceo.office@executive-mail-router.org",
        "display_name": "David Anderson (Chief Executive Officer)",
        "reply_to": "david.private2026@gmail.com",
        "subject": "Strictly Confidential: Acquisition Payment Wire Request",
        "body": "Are you at your desk right now? I am currently in a closed-door board meeting regarding an expedited acquisition. I need you to process an urgent wire transfer of $68,500 to our external escrow partner today. Treat this with maximum discretion and reply directly to this email for routing details.\n\nRegards,\nDavid Anderson\nCEO",
        "urls": [],
        "expected_brand": None,
        "expected_attack": "Business Email Compromise",
        "expected_score": 82
    },
    {
        "id": "scenario-5-bank-urgency",
        "name": "5. Chase Bank Fake Security Alert",
        "category": "High Phishing",
        "sender": "alerts@chase-online-authentication.tk",
        "display_name": "Chase Online Fraud Alert",
        "subject": "Security Notice: Suspicious Login Detected on Your Chase Account",
        "body": "We detected an unauthorized sign-in to your Chase online banking from IP 185.220.101.4 (Moscow, Russia). If you did not authorize this activity, verify your identity immediately to protect your funds: http://chase-online-authentication.tk/verify-account",
        "urls": ["http://chase-online-authentication.tk/verify-account"],
        "expected_brand": "Chase Bank",
        "expected_attack": "Account Takeover",
        "expected_score": 88
    },
    {
        "id": "scenario-6-docusign",
        "name": "6. DocuSign Deceptive Link Mismatch",
        "category": "Critical Phishing",
        "sender": "service@docus1gn-document-portal.com",
        "display_name": "DocuSign Electronic Signature",
        "subject": "Please DocuSign: Executive Compensation Agreement.pdf",
        "body": "You have received an electronic document for review and signature. Click below to view the agreement in the secure DocuSign vault.\n\nLink: http://docus1gn-document-portal.com/document/sign",
        "urls": ["http://docus1gn-document-portal.com/document/sign"],
        "expected_brand": "DocuSign",
        "expected_attack": "Credential Harvesting",
        "expected_score": 91
    },
    {
        "id": "scenario-7-legit-sync",
        "name": "7. Legitimate Internal Engineering Sprint Sync",
        "category": "Benign / Legitimate",
        "sender": "alex.chen@enterprise.com",
        "display_name": "Alex Chen",
        "subject": "Weekly Engineering Sprint Review Agenda - Room 4B",
        "body": "Hi team,\n\nHere is our sprint review agenda for this Thursday at 2:00 PM:\n1. Backend FastAPI rate limiting middleware review.\n2. React Flow visual node state refactor.\n3. Model evaluation metrics update.\n\nPlease check the Jira board before the meeting. Let me know if you need to add any agenda items.\n\nThanks,\nAlex",
        "urls": [],
        "expected_brand": None,
        "expected_attack": None,
        "expected_score": 8
    },
    {
        "id": "scenario-8-legit-aws",
        "name": "8. Legitimate Amazon Web Services Billing Receipt",
        "category": "Benign / Legitimate",
        "sender": "no-reply-aws@amazon.com",
        "display_name": "Amazon Web Services",
        "subject": "Amazon Web Services Invoice [Account: 4891-2819-2910]",
        "body": "Thank you for using Amazon Web Services. Your monthly cloud infrastructure invoice for $342.19 has been charged to your default payment method ending in 5012. You can download your official tax invoice in PDF format directly inside the AWS Management Console.\n\nNo further action is required.",
        "urls": ["https://aws.amazon.com/console/"],
        "expected_brand": "Amazon",
        "expected_attack": None,
        "expected_score": 12
    },
    {
        "id": "scenario-9-campaign-a",
        "name": "9. Coordinated Campaign: PayPal Phish A (Recipient: HR)",
        "category": "Campaign Member",
        "sender": "security-team@paypa1-login.com",
        "display_name": "PayPal Support",
        "subject": "Action Required: Verify PayPal Wallet",
        "body": "Unusual activity was observed on your company PayPal profile. Verify now: http://paypa1-login.com/verify",
        "urls": ["http://paypa1-login.com/verify"],
        "expected_brand": "PayPal",
        "expected_attack": "Credential Harvesting",
        "expected_score": 92
    },
    {
        "id": "scenario-10-campaign-b",
        "name": "10. Coordinated Campaign: PayPal Phish B (Recipient: Finance)",
        "category": "Campaign Member",
        "sender": "verification@paypa1-login.com",
        "display_name": "PayPal Security",
        "subject": "Your account will be suspended! Immediate Confirmation Needed",
        "body": "Final notice regarding your PayPal credentials. Please verify immediately: http://paypa1-login.com/verify",
        "urls": ["http://paypa1-login.com/verify"],
        "expected_brand": "PayPal",
        "expected_attack": "Credential Harvesting",
        "expected_score": 93
    }
]

@router.get("/samples")
def get_demo_samples():
    """
    Returns curated demo email investigation scenarios for one-click testing.
    """
    return DEMO_SCENARIOS
