from typing import Dict, Any, List, Tuple

class AttackTypeClassifier:
    @classmethod
    def classify(
        cls,
        parsed_email: Dict[str, Any],
        indicators: List[Dict[str, Any]],
        brand_match: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes parsed email features and fired indicators to deduce the primary phishing attack vector.
        """
        scores = {
            "credential_harvesting": 0.0,
            "malware_delivery": 0.0,
            "business_email_compromise": 0.0,
            "financial_fraud": 0.0,
            "account_takeover": 0.0,
            "data_theft": 0.0,
            "generic_phishing": 0.1
        }
        evidence_by_type = {k: [] for k in scores}

        # 1. Attachment Analysis
        for ind in indicators:
            if ind.get("source") == "attachment_analysis":
                code = ind.get("indicator_code", "")
                if code in ["EXECUTABLE_BINARY_PAYLOAD", "DECEPTIVE_DOUBLE_EXTENSION", "SCRIPT_FILE_PAYLOAD", "MACRO_ENABLED_OFFICE_DOCUMENT", "DISC_IMAGE_CONTAINER_ARCHIVE"]:
                    scores["malware_delivery"] += 0.60
                    evidence_by_type["malware_delivery"].append(ind.get("evidence", ""))

        # 2. Brand & Link Destination Mismatches
        if brand_match:
            scores["credential_harvesting"] += 0.35
            evidence_by_type["credential_harvesting"].append(f"Targeted brand impersonation ({brand_match.get('brand')}) with lookalike domain '{brand_match.get('detected_domain')}'.")

        for ind in indicators:
            code = ind.get("indicator_code", "")
            if code == "LINK_DESTINATION_MISMATCH":
                scores["credential_harvesting"] += 0.30
                evidence_by_type["credential_harvesting"].append(ind.get("evidence", ""))
            elif code == "SUSPICIOUS_AUTHENTICATION_PATH" or code == "HTTP_FOR_SENSITIVE_ACTION":
                scores["credential_harvesting"] += 0.25
                evidence_by_type["credential_harvesting"].append(ind.get("evidence", ""))
            elif code == "CREDENTIAL_HARVESTING_SOLICITATION":
                scores["credential_harvesting"] += 0.30
                scores["account_takeover"] += 0.20
                evidence_by_type["credential_harvesting"].append(ind.get("evidence", ""))
            elif code == "ACCOUNT_SUSPENSION_THREAT":
                scores["account_takeover"] += 0.35
                scores["credential_harvesting"] += 0.20
                evidence_by_type["account_takeover"].append(ind.get("evidence", ""))
            elif code == "AUTHORITY_FIGURE_IMPERSONATION":
                scores["business_email_compromise"] += 0.50
                evidence_by_type["business_email_compromise"].append(ind.get("evidence", ""))
            elif code == "FINANCIAL_FRAUD_TRIGGER":
                scores["financial_fraud"] += 0.45
                scores["business_email_compromise"] += 0.20
                evidence_by_type["financial_fraud"].append(ind.get("evidence", ""))
            elif code == "FREE_EMAIL_FOR_OFFICIAL_ROLE":
                scores["business_email_compromise"] += 0.25
                evidence_by_type["business_email_compromise"].append(ind.get("evidence", ""))

        # Select highest scoring attack vector
        sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_type, raw_score = sorted_types[0]

        # Calculate calibrated confidence (0.0 to 0.99)
        if raw_score <= 0.2:
            top_type = "generic_phishing"
            confidence = 0.50
            evidence = ["Generic suspicious language or unaligned identifiers detected."]
        else:
            confidence = min(0.98, max(0.65, round(raw_score / 1.0, 2)))
            evidence = evidence_by_type[top_type]
            if not evidence:
                evidence = [f"Pattern alignment with {top_type.replace('_', ' ').title()} playbooks."]

        return {
            "attack_type": top_type,
            "confidence": confidence,
            "evidence": evidence[:3]
        }
