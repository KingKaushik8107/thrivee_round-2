import re
from typing import Dict, Any, List

# Structured detection patterns with severity and category
CONTENT_PATTERNS = [
    # 1. Urgency & Deadlines
    {
        "category": "urgency",
        "code": "URGENT_CALL_TO_ACTION",
        "title": "Artificial Urgency & Time-Pressure Tactics",
        "severity": "medium",
        "patterns": [
            r'\b(?:immediately|urgent(?:ly)?|act now|within 24 hours?|within 12 hours?|right away|promptly|without delay|expires in|time-sensitive)\b',
            r'\b(?:final warning|last notice|action required immediately|immediate attention)\b'
        ],
        "description": "Adversaries fabricate impending deadlines to induce anxiety and prevent recipients from critically verifying the message authenticity."
    },
    # 2. Threat & Account Suspension
    {
        "category": "threat_language",
        "code": "ACCOUNT_SUSPENSION_THREAT",
        "title": "Threat of Account Suspension or Termination",
        "severity": "high",
        "patterns": [
            r'\b(?:account (?:will be|has been|is) suspended|account (?:will be|has been) deleted|access (?:will be|has been) revoked)\b',
            r'\b(?:account locked|account terminated|permanently closed|unauthorized activity detected|security violation)\b',
            r'\b(?:legal action|law enforcement|breach of terms|fraudulent activity detected)\b'
        ],
        "description": "Coercive threats of account suspension or punitive action force victims into rushed compliance with attacker demands."
    },
    # 3. Credential Harvesting & Verification Requests
    {
        "category": "credential_harvesting",
        "code": "CREDENTIAL_HARVESTING_SOLICITATION",
        "title": "Solicitation of Login Credentials / Identity Verification",
        "severity": "high",
        "patterns": [
            r'\b(?:verify (?:your )?(?:account|identity|password|credentials|profile|security details))\b',
            r'\b(?:confirm (?:your )?(?:password|credentials|account|login|identity))\b',
            r'\b(?:login (?:immediately|here|now)|sign in to verify|authenticate your account)\b',
            r'\b(?:enter your (?:password|pin|security key|passcode|one-time password|otp))\b',
            r'\b(?:update your (?:billing|payment|account) information)\b'
        ],
        "description": "Direct requests to verify passwords or enter sensitive credentials are primary indicators of credential-harvesting phishing campaigns."
    },
    # 4. Financial Manipulation & Fraud
    {
        "category": "financial_manipulation",
        "code": "FINANCIAL_FRAUD_TRIGGER",
        "title": "Financial Transaction / Invoice Pressure",
        "severity": "medium",
        "patterns": [
            r'\b(?:payment failed|invoice (?:attached|overdue|pending)|wire transfer|direct deposit)\b',
            r'\b(?:refund (?:pending|processed|approved)|tax refund|bank transfer instructions)\b',
            r'\b(?:crypto transfer|bitcoin payment|gift card|unpaid bill|billing statement)\b'
        ],
        "description": "Financial lures leverage panic over failed payments or greed over unexpected refunds to prompt engagement."
    },
    # 5. Authority Impersonation (BEC / Helpdesk)
    {
        "category": "social_engineering",
        "code": "AUTHORITY_FIGURE_IMPERSONATION",
        "title": "Authority Figure / Executive Impersonation (BEC Pattern)",
        "severity": "high",
        "patterns": [
            r'\b(?:i need you to handle this discreetly|are you available right now|are you at your desk)\b',
            r'\b(?:strictly confidential|wire funds immediately|process this payment today)\b',
            r'\b(?:from the desk of the ceo|message from management|it helpdesk security update)\b'
        ],
        "description": "Business Email Compromise (BEC) attacks mimic corporate leadership or internal IT staff to bypass standard approval workflows."
    },
    # 6. Reward & Greed Lures
    {
        "category": "reward_lure",
        "code": "UNSOLICITED_REWARD_OR_PRIZE",
        "title": "Unsolicited Reward or Financial Compensation Lure",
        "severity": "medium",
        "patterns": [
            r'\b(?:you have won|congratulations you are selected|claim your prize|claim your reward)\b',
            r'\b(?:compensation fund|million dollars?|lottery winner|exclusive grant)\b'
        ],
        "description": "Advance-fee and prize scams entice victims with outsized financial rewards in exchange for personal information or processing fees."
    }
]

class ContentAnalyzer:
    @classmethod
    def analyze_content(cls, subject: str, body: str) -> List[Dict[str, Any]]:
        indicators = []
        combined_text = f"{subject}\n{body}".strip()
        if not combined_text:
            return indicators

        # Split text into sentences for exact evidence citation
        sentences = [s.strip() for s in re.split(r'[.!?\n]+', combined_text) if s.strip()]

        for group in CONTENT_PATTERNS:
            matched_sentences = []
            for pattern_str in group["patterns"]:
                regex = re.compile(pattern_str, re.IGNORECASE)
                for sentence in sentences:
                    m = regex.search(sentence)
                    if m:
                        # Highlight the matched phrase within the sentence
                        matched_snippet = sentence
                        if matched_snippet not in matched_sentences:
                            matched_sentences.append(matched_snippet)

            if matched_sentences:
                # Combine matching sentence evidence
                evidence_text = ' "'.join([s.strip('"') for s in matched_sentences[:2]])
                if len(matched_sentences) > 2:
                    evidence_text += f' (and {len(matched_sentences)-2} other occurrences)'

                indicators.append({
                    "source": "content_analysis",
                    "category": group["category"],
                    "indicator_code": group["code"],
                    "title": group["title"],
                    "severity": group["severity"],
                    "evidence": f'Detected phrase in: "{evidence_text}"',
                    "description": group["description"]
                })

        return indicators
