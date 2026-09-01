from typing import Dict, Any, List

class ResponseRecommendationEngine:
    @classmethod
    def generate_recommendations(
        cls,
        verdict: str,
        risk_score: float,
        attack_type: str,
        indicators: List[Dict[str, Any]],
        iocs: Dict[str, List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates a prioritized SOC remediation playbook based on the incident findings.
        """
        recommendations = []

        # 1. Benign / Legitimate email handling
        if verdict == "legitimate" or risk_score < 25.0:
            return [
                {
                    "priority": "low",
                    "category": "allow_delivery",
                    "title": "Release Message to Recipient Mailbox",
                    "action": "Allow standard delivery. No malicious cues or deceptive headers were identified.",
                    "status": "recommended"
                },
                {
                    "priority": "low",
                    "category": "baseline_logging",
                    "title": "Log Baseline Audit Record",
                    "action": "Record transaction metadata for enterprise baseline communication profiling.",
                    "status": "optional"
                }
            ]

        # 2. Immediate Containment Actions
        recommendations.append({
            "priority": "critical" if verdict == "critical_phishing" else "high",
            "category": "containment",
            "title": "Quarantine Email from Recipient Inbox",
            "action": "Execute immediate mailbox purge or administrative quarantine to prevent user interaction.",
            "status": "pending"
        })

        # 3. Targeted Identity & Credential Protection
        if attack_type in ["credential_harvesting", "account_takeover"] or any("CREDENTIAL" in i.get("indicator_code", "") for i in indicators):
            recommendations.append({
                "priority": "critical",
                "category": "identity_protection",
                "title": "Revoke User Credentials & Invalidate Active SSO Sessions",
                "action": "Force password reset for the target recipient and revoke all active OAuth/SAML session tokens.",
                "status": "pending"
            })
            recommendations.append({
                "priority": "high",
                "category": "investigation",
                "title": "Audit Authentication & MFA Logs",
                "action": "Examine identity provider (IdP) logs for unusual sign-ins or impossible travel from the recipient's account in the last 24 hours.",
                "status": "pending"
            })

        # 4. Malware Delivery Actions
        if attack_type == "malware_delivery" or any(i.get("source") == "attachment_analysis" for i in indicators):
            recommendations.append({
                "priority": "critical",
                "category": "endpoint_containment",
                "title": "Isolate Affected Host Device",
                "action": "If attachment was opened, trigger EDR host isolation and dispatch an on-demand memory & forensic triage scan.",
                "status": "pending"
            })
            recommendations.append({
                "priority": "high",
                "category": "ioc_sweep",
                "title": "Sweep Enterprise Endpoints for File Hash",
                "action": "Query SIEM / EDR for occurrences of the extracted attachment SHA-256 hash across all endpoints.",
                "status": "pending"
            })

        # 5. Perimeter Network Defense
        recommendations.append({
            "priority": "high",
            "category": "network_defense",
            "title": "Block Malicious Infrastructure at Perimeter",
            "action": "Push extracted lookalike domains and URLs to corporate DNS firewalls (RPZ) and Secure Web Gateways (SWG).",
            "status": "pending"
        })

        # 6. Tenant-Wide Scope Assessment
        recommendations.append({
            "priority": "medium",
            "category": "threat_hunting",
            "title": "Execute Tenant-Wide Mailbox Sweep",
            "action": "Search Microsoft Exchange / Google Workspace mailboxes for identical subjects, senders, or message IDs to find all impacted users.",
            "status": "pending"
        })

        # 7. Threat Intelligence Sharing
        recommendations.append({
            "priority": "medium",
            "category": "threat_intel",
            "title": "Submit IOCs to Internal / External Threat Feeds",
            "action": "Export IOC bundle to MISP / ThreatConnect and report URLs to abuse desks (URLhaus, registrar abuse contacts).",
            "status": "pending"
        })

        return recommendations
