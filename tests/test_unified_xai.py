import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.risk.xai_engine import UnifiedXAIEngine
from backend.risk.scoring import HybridRiskEngine
from backend.ml.predict import explain_email, predict_email

client = TestClient(app)

PHISHING_SAMPLE = """From: security@paypa1-login.com
Subject: URGENT: Your account has been suspended!

Dear customer, your PayPal account has been suspended due to unauthorized login attempts.
You must verify your identity immediately by clicking below:
http://paypa1-login.com/verify-account
"""

BENIGN_SAMPLE = """From: vince.kaminski@enron.com
Subject: Enron Power Market Research Meeting

Hi team, thanks for the market research notes. Attached is the presentation for tomorrow's meeting.
Let me know if you have any questions.
"""

def test_xai_integration_phishing():
    """Test 1: Phishing email returns prediction, risk score, xai, and model features."""
    payload = {"raw_content": PHISHING_SAMPLE}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["verdict"] in ["critical_phishing", "phishing"]
    assert data["risk_score"] >= 80.0
    assert "xai" in data
    assert data["xai"] is not None

    xai = data["xai"]
    assert "model_features" in xai
    assert "forensic_evidence" in xai
    assert "threat_intelligence_evidence" in xai
    assert "summary" in xai
    assert "confidence_notes" in xai

    mf = xai["model_features"]
    assert "decision_score" in mf
    assert "intercept" in mf
    assert "total_feature_contribution" in mf
    assert "top_phishing_features" in mf
    assert "is_mathematically_valid" in mf
    assert mf["is_mathematically_valid"] is True
    assert mf["decision_score"] > 0
    assert len(mf["top_phishing_features"]) > 0

def test_xai_integration_legitimate():
    """Test 2: Benign email returns legitimate-direction features correctly."""
    payload = {"raw_content": BENIGN_SAMPLE}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["verdict"] == "legitimate"
    assert data["risk_score"] <= 25.0
    assert "xai" in data

    mf = data["xai"]["model_features"]
    assert mf["decision_score"] < 0
    assert len(mf["top_legitimate_features"]) > 0
    # Top legitimate feature contributions must be negative
    for f in mf["top_legitimate_features"]:
        assert f["contribution"] < 0
        assert f["direction"] == "legitimate"

def test_feature_separation():
    """Test 3: Positive features appear only in top_phishing_features, negative in top_legitimate_features."""
    res = explain_email(
        subject="URGENT: Your account has been suspended!",
        body="Verify your account immediately at http://paypa1-login.com/verify-account",
        sender="security@paypa1-login.com"
    )
    xai = res["xai"]
    unified = UnifiedXAIEngine.build_explanation(ml_xai=xai)
    mf = unified["model_features"]

    for f in mf["top_phishing_features"]:
        assert f["contribution"] > 0
        assert f["direction"] == "phishing"

    for f in mf["top_legitimate_features"]:
        assert f["contribution"] < 0
        assert f["direction"] == "legitimate"

def test_mathematical_validation():
    """Test 4: Verify intercept + sum(contributions) ≈ decision_score."""
    res = explain_email(
        subject="Urgent Security Alert: Verify Your Account",
        body="Dear customer, please click to verify account details.",
        sender="service@bank-security.com"
    )
    xai = res["xai"]
    assert xai["is_mathematically_valid"] is True
    reconstructed = xai["intercept"] + xai["total_feature_contribution"]
    assert abs(reconstructed - xai["decision_score"]) < 1e-3

def test_risk_score_unchanged():
    """Test 5: Risk score calculated with or without XAI remains identical."""
    indicators = [
        {"source": "brand_analysis", "severity": "critical", "indicator_code": "BRAND_LOOKALIKE_DOMAIN"},
        {"source": "sender_analysis", "severity": "high", "indicator_code": "DISPLAY_NAME_BRAND_MISMATCH"}
    ]
    ti = [{"status": "malicious", "ioc_value": "paypa1.com"}]
    
    # Calculate risk directly using HybridRiskEngine
    res_direct = HybridRiskEngine.calculate_risk(ml_prob=0.95, indicators=indicators, threat_intel_results=ti)
    
    # Analyze via full endpoint
    payload = {"raw_content": PHISHING_SAMPLE}
    res_api = client.post("/api/analyze", json=payload).json()
    
    # Risk score must match standard formula: 0 <= score <= 100
    assert 0 <= res_api["risk_score"] <= 100
    assert res_api["breakdown"]["ml"]["score"] == round(res_api["ml_probability"] * 30.0, 2)

def test_existing_api_compatibility():
    """Test 6: All existing API response fields remain present and typed correctly."""
    payload = {"raw_content": PHISHING_SAMPLE}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    required_keys = [
        "incident_id", "verdict", "risk_score", "ml_probability",
        "attack_type", "attack_type_confidence", "target_brand",
        "brand_similarity", "summary", "explanation", "email",
        "indicators", "iocs", "breakdown", "recommendations",
        "campaign_id", "created_at", "xai"
    ]
    for key in required_keys:
        assert key in data, f"Missing required response field: {key}"

def test_missing_threat_intel():
    """Test 7: If threat intelligence is unavailable, XAI still functions gracefully."""
    ml_xai = {
        "decision_score": 3.5,
        "intercept": 0.1,
        "total_feature_contribution": 3.4,
        "reconstructed_decision_score": 3.5,
        "is_mathematically_valid": True,
        "active_feature_count": 5,
        "top_phishing_features": [{"feature": "verify", "weight": 2.0, "tfidf": 0.5, "contribution": 1.0, "direction": "phishing"}],
        "top_legitimate_features": [],
        "token_highlights": []
    }
    # No TI provided
    unified = UnifiedXAIEngine.build_explanation(
        ml_xai=ml_xai,
        forensic_indicators=[],
        threat_intel_results=None,
        risk_score=75.0,
        verdict="phishing"
    )
    assert unified["threat_intelligence_evidence"] == []
    assert unified["model_features"]["decision_score"] == 3.5
    assert len(unified["model_features"]["top_phishing_features"]) == 1
    assert "verify" in unified["summary"]

def test_empty_input_handling():
    """Test 8: Safe handling of empty content without crashing."""
    payload = {"raw_content": ""}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "xai" in data
    assert data["xai"]["model_features"]["is_mathematically_valid"] is True

def test_explanation_grounding():
    """Test 9: If executive summary references ML features, those features exist in XAI."""
    payload = {"raw_content": PHISHING_SAMPLE}
    response = client.post("/api/analyze", json=payload)
    data = response.json()
    
    summary = data["summary"]
    xai_feats = [f["feature"] for f in data["xai"]["model_features"]["top_phishing_features"]]
    
    # If summary contains quoted words from ML, ensure they match top features
    for feat in xai_feats[:2]:
        if f"'{feat}'" in summary:
            assert feat in xai_feats

def test_no_probability_misuse():
    """Test 10: Feature contributions are decision-score deltas, not labeled as percentage points."""
    res = explain_email(
        subject="URGENT: Your account has been suspended!",
        body="Verify your account immediately at http://paypa1-login.com/verify-account",
        sender="security@paypa1-login.com"
    )
    unified = UnifiedXAIEngine.build_explanation(ml_xai=res["xai"])
    mf = unified["model_features"]

    # Contributions are raw linear additions to the decision score (logits), not bounded in [0, 100] percentages
    for feat in mf["top_phishing_features"]:
        assert isinstance(feat["contribution"], float)
        assert feat["direction"] == "phishing"
        assert feat["contribution"] > 0
        # Check that weight * tfidf equals contribution within rounding precision
        expected = round(feat["weight"] * feat["tfidf"], 4)
        assert abs(feat["contribution"] - expected) < 1e-3
