import pytest
from backend.risk.scoring import HybridRiskEngine
from backend.risk.explanation import RiskExplanationEngine

def test_risk_scoring_critical():
    indicators = [
        {"source": "brand_analysis", "severity": "critical", "indicator_code": "BRAND_LOOKALIKE_DOMAIN"},
        {"source": "url_analysis", "severity": "critical", "indicator_code": "LINK_DESTINATION_MISMATCH"},
        {"source": "content_analysis", "severity": "high", "indicator_code": "CREDENTIAL_HARVESTING_SOLICITATION"},
        {"source": "sender_analysis", "severity": "high", "indicator_code": "DISPLAY_NAME_BRAND_MISMATCH"}
    ]
    ti_results = [{"status": "malicious"}]
    res = HybridRiskEngine.calculate_risk(ml_prob=0.94, indicators=indicators, threat_intel_results=ti_results)
    
    assert res["risk_score"] >= 86.0
    assert res["verdict"] == "critical_phishing"
    assert res["breakdown"]["ml"]["score"] > 25.0
    assert res["breakdown"]["domain_brand"]["score"] > 20.0

def test_risk_scoring_benign():
    indicators = []
    res = HybridRiskEngine.calculate_risk(ml_prob=0.08, indicators=indicators, threat_intel_results=[])
    assert res["risk_score"] <= 25.0
    assert res["verdict"] == "legitimate"

def test_risk_explanation_consistency():
    indicators = [
        {"source": "brand_analysis", "severity": "critical", "title": "Brand Impersonation", "evidence": "paypa1-login.com resembles paypal.com"},
        {"source": "content_analysis", "severity": "high", "title": "Account Suspension Threat", "evidence": "Your account will be suspended"}
    ]
    explanation = RiskExplanationEngine.generate_explanation(
        risk_score=92.0,
        verdict="critical_phishing",
        ml_prob=0.94,
        target_brand="PayPal",
        attack_type="credential_harvesting",
        indicators=indicators,
        breakdown={}
    )
    assert "CRITICAL PHISHING" in explanation["verdict_display"]
    assert "PayPal" in explanation["executive_summary"]
    assert explanation["critical_count"] == 1
    assert explanation["high_count"] == 1
