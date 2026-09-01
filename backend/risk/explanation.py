from typing import Dict, Any, List

class RiskExplanationEngine:
    @classmethod
    def generate_explanation(
        cls,
        risk_score: float,
        verdict: str,
        ml_prob: float,
        target_brand: str,
        attack_type: str,
        indicators: List[Dict[str, Any]],
        breakdown: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synthesizes structured forensic findings into an explainable, plain-English incident narrative.
        """
        verdict_labels = {
            "critical_phishing": "CRITICAL PHISHING",
            "phishing": "PHISHING",
            "suspicious": "SUSPICIOUS EMAIL",
            "legitimate": "LEGITIMATE / BENIGN"
        }
        verdict_display = verdict_labels.get(verdict, verdict.upper())

        # Group indicators by severity
        grouped = {
            "critical": [],
            "high": [],
            "medium": [],
            "low": []
        }
        for ind in indicators:
            sev = ind.get("severity", "low").lower()
            if sev in grouped:
                grouped[sev].append(ind)

        # Build executive summary paragraph
        summary_parts = []
        if verdict in ["critical_phishing", "phishing"]:
            summary_parts.append(
                f"This email has been classified as {verdict_display} with a composite risk score of {int(risk_score)}/100."
            )
            if target_brand:
                summary_parts.append(f"Forensic signals detect deliberate impersonation of {target_brand}.")
            if attack_type and attack_type != "generic_phishing":
                summary_parts.append(f"The primary attack objective is {attack_type.replace('_', ' ').title()}.")
            summary_parts.append(f"Statistical ML language modeling predicts a {int(ml_prob * 100)}% phishing probability.")
        elif verdict == "suspicious":
            summary_parts.append(
                f"This email has been classified as SUSPICIOUS (risk score: {int(risk_score)}/100) due to unaligned sender cues or urgency signals."
            )
        else:
            summary_parts.append(
                f"This email is evaluated as LEGITIMATE (risk score: {int(risk_score)}/100). No anomalous brand spoofing, deceptive links, or malicious payloads were identified."
            )

        executive_summary = " ".join(summary_parts)

        # Build formatted bulleted evidence trail
        evidence_lines = [
            f"=== VERDICT: {verdict_display} (Risk Score: {risk_score}/100) ===",
            f"Machine Learning Phishing Probability: {int(ml_prob * 100)}%",
            ""
        ]

        if indicators:
            evidence_lines.append("FORENSIC INDICATORS FIRED:")
            for sev in ["critical", "high", "medium", "low"]:
                if grouped[sev]:
                    evidence_lines.append(f"\n[{sev.upper()}] ({len(grouped[sev])} fired)")
                    for ind in grouped[sev]:
                        evidence_lines.append(f"• {ind.get('title')}: {ind.get('evidence')}")
        else:
            evidence_lines.append("No adverse security indicators detected.")

        return {
            "verdict_display": verdict_display,
            "executive_summary": executive_summary,
            "structured_explanation": "\n".join(evidence_lines),
            "critical_count": len(grouped["critical"]),
            "high_count": len(grouped["high"]),
            "medium_count": len(grouped["medium"]),
            "low_count": len(grouped["low"]),
            "total_indicators": len(indicators)
        }
