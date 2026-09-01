from typing import Dict, Any, List, Tuple

DEFAULT_WEIGHTS = {
    "ml": 30.0,
    "domain_brand": 25.0,
    "url": 20.0,
    "sender": 10.0,
    "content": 10.0,
    "threat_intel": 5.0
}

SEVERITY_SCORES = {
    "critical": 1.0,
    "high": 0.70,
    "medium": 0.40,
    "low": 0.15
}

class HybridRiskEngine:
    @classmethod
    def calculate_risk(
        cls,
        ml_prob: float,
        indicators: List[Dict[str, Any]],
        threat_intel_results: List[Dict[str, Any]] = None,
        weights: Dict[str, float] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes ML inference, forensic rule indicators, and threat intelligence into an explainable 0-100 risk score and verdict.
        """
        w = weights or DEFAULT_WEIGHTS

        # 1. ML Contribution (Max: w["ml"], e.g. 30)
        ml_score = round(float(ml_prob) * w["ml"], 2)

        # Group indicators by source
        grouped_indicators: Dict[str, List[Dict[str, Any]]] = {
            "sender_analysis": [],
            "domain_analysis": [],
            "brand_analysis": [],
            "url_analysis": [],
            "content_analysis": [],
            "attachment_analysis": []
        }
        for ind in indicators:
            src = ind.get("source", "")
            if src in grouped_indicators:
                grouped_indicators[src].append(ind)

        # 2. Domain & Brand Contribution (Max: w["domain_brand"], e.g. 25)
        domain_indicators = grouped_indicators["domain_analysis"] + grouped_indicators["brand_analysis"]
        domain_brand_ratio = cls._compute_category_severity_ratio(domain_indicators)
        domain_brand_score = round(domain_brand_ratio * w["domain_brand"], 2)

        # 3. URL Contribution (Max: w["url"], e.g. 20)
        url_indicators = grouped_indicators["url_analysis"]
        url_ratio = cls._compute_category_severity_ratio(url_indicators)
        url_score = round(url_ratio * w["url"], 2)

        # 4. Sender Contribution (Max: w["sender"], e.g. 10)
        sender_indicators = grouped_indicators["sender_analysis"]
        sender_ratio = cls._compute_category_severity_ratio(sender_indicators)
        sender_score = round(sender_ratio * w["sender"], 2)

        # 5. Content & Attachment Contribution (Max: w["content"], e.g. 10)
        content_att_indicators = grouped_indicators["content_analysis"] + grouped_indicators["attachment_analysis"]
        content_ratio = cls._compute_category_severity_ratio(content_att_indicators)
        content_score = round(content_ratio * w["content"], 2)

        # 6. Threat Intelligence Contribution (Max: w["threat_intel"], e.g. 5)
        ti_score = 0.0
        if threat_intel_results:
            for ti in threat_intel_results:
                st = ti.get("status", "").lower()
                if st == "malicious":
                    ti_score = w["threat_intel"]
                    break
                elif st == "suspicious":
                    ti_score = max(ti_score, w["threat_intel"] * 0.6)

        # Sum total risk score (capped at 100.0)
        total_risk = min(100.0, round(ml_score + domain_brand_score + url_score + sender_score + content_score + ti_score, 1))

        # Determine Verdict
        # Thresholds: 0-25: Legitimate, 26-55: Suspicious, 56-85: Phishing, 86-100: Critical Phishing
        if total_risk >= 86.0:
            verdict = "critical_phishing"
        elif total_risk >= 56.0:
            verdict = "phishing"
        elif total_risk >= 26.0:
            verdict = "suspicious"
        else:
            verdict = "legitimate"

        return {
            "risk_score": total_risk,
            "verdict": verdict,
            "breakdown": {
                "ml": {"score": ml_score, "max": w["ml"], "percentage": round((ml_score / w["ml"]) * 100, 1)},
                "domain_brand": {"score": domain_brand_score, "max": w["domain_brand"], "percentage": round((domain_brand_score / w["domain_brand"]) * 100, 1)},
                "url": {"score": url_score, "max": w["url"], "percentage": round((url_score / w["url"]) * 100, 1)},
                "sender": {"score": sender_score, "max": w["sender"], "percentage": round((sender_score / w["sender"]) * 100, 1)},
                "content": {"score": content_score, "max": w["content"], "percentage": round((content_score / w["content"]) * 100, 1)},
                "threat_intel": {"score": ti_score, "max": w["threat_intel"], "percentage": round((ti_score / w["threat_intel"]) * 100, 1)}
            },
            "weights": w
        }

    @classmethod
    def _compute_category_severity_ratio(cls, indicators: List[Dict[str, Any]]) -> float:
        if not indicators:
            return 0.0

        # If any critical indicator fired, max out category
        severities = [ind.get("severity", "low").lower() for ind in indicators]
        if "critical" in severities:
            return 1.0

        # Accumulate severity weights
        score_sum = sum(SEVERITY_SCORES.get(s, 0.2) for s in severities)
        return min(1.0, score_sum)
