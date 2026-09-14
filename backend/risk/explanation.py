from typing import Dict, Any, List, Optional

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
        breakdown: Dict[str, Any],
        ml_xai: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes structured forensic findings and ML feature attributions into an explainable, plain-English incident narrative.
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

            # Grounded XAI narrative for phishing
            if ml_xai and isinstance(ml_xai, dict):
                top_phish_feats = [f["feature"] for f in ml_xai.get("top_phishing_features", [])[:3]]
                if top_phish_feats:
                    feats_formatted = ", ".join(f"'{f}'" for f in top_phish_feats)
                    summary_parts.append(f"Machine-learning feature analysis identified {feats_formatted} as strong phishing-direction features.")
        elif verdict == "suspicious":
            summary_parts.append(
                f"This email has been classified as SUSPICIOUS (risk score: {int(risk_score)}/100) due to unaligned sender cues or urgency signals."
            )
            if ml_xai and isinstance(ml_xai, dict):
                top_phish_feats = [f["feature"] for f in ml_xai.get("top_phishing_features", [])[:3]]
                if top_phish_feats:
                    feats_formatted = ", ".join(f"'{f}'" for f in top_phish_feats)
                    summary_parts.append(f"Machine-learning feature analysis noted {feats_formatted} as notable phishing-direction features.")
        else:
            summary_parts.append(
                f"This email is evaluated as LEGITIMATE (risk score: {int(risk_score)}/100). No anomalous brand spoofing, deceptive links, or malicious payloads were identified."
            )
            if ml_xai and isinstance(ml_xai, dict):
                top_legit_feats = [f["feature"] for f in ml_xai.get("top_legitimate_features", [])[:3]]
                if top_legit_feats:
                    feats_formatted = ", ".join(f"'{f}'" for f in top_legit_feats)
                    summary_parts.append(f"Machine-learning feature attribution identified {feats_formatted} as strong legitimate-direction features.")

        executive_summary = " ".join(summary_parts)

        # Build formatted bulleted evidence trail
        evidence_lines = [
            f"=== VERDICT: {verdict_display} (Risk Score: {risk_score}/100) ===",
            f"Machine Learning Phishing Probability: {int(ml_prob * 100)}%"
        ]

        if ml_xai and isinstance(ml_xai, dict):
            d_score = ml_xai.get("decision_score", 0.0)
            intercept = ml_xai.get("intercept", 0.0)
            evidence_lines.append(f"ML Decision Score: {d_score:+.4f} (Model Intercept: {intercept:+.4f})")

            top_phish = ml_xai.get("top_phishing_features", [])[:5]
            if top_phish:
                phish_str = ", ".join(f"{f['feature']} ({f['contribution']:+.4f})" for f in top_phish)
                evidence_lines.append(f"Top Phishing-Direction Features: {phish_str}")

            top_legit = ml_xai.get("top_legitimate_features", [])[:5]
            if top_legit:
                legit_str = ", ".join(f"{f['feature']} ({f['contribution']:+.4f})" for f in top_legit)
                evidence_lines.append(f"Top Legitimate-Direction Features: {legit_str}")

        evidence_lines.append("")

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

