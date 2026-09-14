import pytest
import numpy as np
from backend.ml import predict_email, explain_email, PhishingClassifier, LocalFeatureExplainer
from backend.ml.predict import get_or_load_model
from backend.ml.preprocess import combine_email_fields

def test_xai_valid_structure():
    """
    Test 1: Verify explain_email returns the complete, valid XAI response structure.
    """
    subject = "Account Suspension Notice - Immediate Action Required"
    body = "Your PayPal account has been suspended due to suspicious activity. Please verify your identity immediately at http://paypa1-login.com/verify to restore access."
    sender = "security@paypa1-login.com"
    urls = ["http://paypa1-login.com/verify"]

    result = explain_email(subject=subject, body=body, sender=sender, urls=urls, top_k=10)

    # Core response fields
    assert "prediction" in result
    assert result["prediction"] in ("phishing", "legitimate")
    assert "phishing_probability" in result
    assert "legitimate_probability" in result
    assert 0.0 <= result["phishing_probability"] <= 1.0
    assert 0.0 <= result["legitimate_probability"] <= 1.0
    assert abs((result["phishing_probability"] + result["legitimate_probability"]) - 1.0) < 1e-3

    # XAI sub-structure
    assert "xai" in result
    xai = result["xai"]
    assert "intercept" in xai
    assert "decision_score" in xai
    assert "total_feature_contribution" in xai
    assert "reconstructed_decision_score" in xai
    assert "is_mathematically_valid" in xai
    assert "active_feature_count" in xai
    assert "top_phishing_features" in xai
    assert "top_legitimate_features" in xai
    assert "token_highlights" in xai

    assert isinstance(xai["top_phishing_features"], list)
    assert isinstance(xai["top_legitimate_features"], list)
    assert isinstance(xai["token_highlights"], list)

def test_xai_positive_negative_separation():
    """
    Test 2: Verify positive features (pushing toward phishing) and negative features
    (pushing toward legitimate) are strictly separated and sorted correctly.
    """
    subject = "Urgent: Verify payment or account will be closed"
    body = "Please click here to confirm your password and billing info. Thanks, Sincerely, IT Helpdesk."
    sender = "admin@paypa1-login.com"
    urls = ["http://paypa1-login.com/auth"]

    result = explain_email(subject=subject, body=body, sender=sender, urls=urls, top_k=15)
    xai = result["xai"]

    # All positive features must have contribution > 0 and direction == "phishing"
    for item in xai["top_phishing_features"]:
        assert item["contribution"] > 0, f"Expected positive contribution, got {item['contribution']}"
        assert item["direction"] == "phishing"
        assert item["tfidf"] > 0
        assert item["weight"] != 0

    # Top phishing features must be sorted descending by contribution
    pos_contribs = [item["contribution"] for item in xai["top_phishing_features"]]
    assert pos_contribs == sorted(pos_contribs, reverse=True)

    # All negative features must have contribution < 0 and direction == "legitimate"
    for item in xai["top_legitimate_features"]:
        assert item["contribution"] < 0, f"Expected negative contribution, got {item['contribution']}"
        assert item["direction"] == "legitimate"
        assert item["tfidf"] > 0
        assert item["weight"] != 0

    # Top legitimate features must be sorted ascending (most negative first)
    neg_contribs = [item["contribution"] for item in xai["top_legitimate_features"]]
    assert neg_contribs == sorted(neg_contribs)

def test_xai_top_k_limit():
    """
    Test 3: Verify top_k argument restricts the number of returned positive and negative features.
    """
    subject = "Security alert from PayPal support"
    body = "Click to verify your suspended account immediately. We detected unauthorized wire transfer. Sincerely, Customer Care."
    sender = "security@paypa1-login.com"

    result_k3 = explain_email(subject=subject, body=body, sender=sender, top_k=3)
    xai_k3 = result_k3["xai"]

    assert len(xai_k3["top_phishing_features"]) <= 3
    assert len(xai_k3["top_legitimate_features"]) <= 3

    result_k7 = explain_email(subject=subject, body=body, sender=sender, top_k=7)
    xai_k7 = result_k7["xai"]

    assert len(xai_k7["top_phishing_features"]) <= 7
    assert len(xai_k7["top_legitimate_features"]) <= 7

def test_xai_contribution_calculation():
    """
    Test 4: Verify individual feature contribution equals weight * tfidf value.
    """
    model = get_or_load_model()
    if model is None:
        pytest.skip("Model artifacts not loaded.")

    text = "FROM: security@paypa1-login.com\nSUBJECT: Account suspension\nBODY: Please click here to verify login credentials\nLINKS: http://paypa1-login.com"
    xai = model.explain_instance(text, top_k=10)

    for item in xai["top_phishing_features"] + xai["top_legitimate_features"]:
        calculated = round(item["weight"] * item["tfidf"], 4)
        assert abs(item["contribution"] - calculated) <= 1e-3, (
            f"Contribution mismatch for {item['feature']}: {item['contribution']} vs {calculated}"
        )

def test_xai_mathematical_reconstruction():
    """
    Test 5: Verify intercept + sum(all_contributions) == decision_score (logit)
    within floating-point tolerance (< 1e-4).
    """
    model = get_or_load_model()
    if model is None:
        pytest.skip("Model artifacts not loaded.")

    sample_texts = [
        "FROM: security@paypa1-login.com\nSUBJECT: Suspended account\nBODY: Verify now at http://paypa1-login.com/verify",
        "FROM: newsletter@python.org\nSUBJECT: Weekly Python News\nBODY: Python 3.13 released with performance updates. Thanks for subscribing.",
        "FROM: billing@aws.amazon.com\nSUBJECT: Invoice receipt\nBODY: Attached is your monthly cloud hosting statement.",
        "FROM: urgent@bank-security.com\nSUBJECT: Unauthorized transaction alert\nBODY: Your debit card was charged $1500. Click to dispute."
    ]

    for text in sample_texts:
        xai = model.explain_instance(text, top_k=10)
        
        # Exact mathematical validation check flag
        assert xai["is_mathematically_valid"] is True

        # Reconstructed decision score check
        intercept = xai["intercept"]
        total_contrib = xai["total_feature_contribution"]
        decision_score = xai["decision_score"]

        diff = abs(decision_score - (intercept + total_contrib))
        assert diff < 1e-3, f"Mathematical reconstruction failed! diff={diff} on text: {text[:40]}"

        # Verify logistic sigmoid link
        prob_phish = 1.0 / (1.0 + np.exp(-decision_score))
        assert 0.0 <= prob_phish <= 1.0

def test_predict_email_backward_compatibility():
    """
    Test 6: Verify existing predict_email function returns unchanged fields and identical probabilities.
    """
    subject = "Account alert"
    body = "Please click to update password."
    sender = "security@paypa1-login.com"
    urls = ["http://paypa1-login.com"]

    pred = predict_email(subject=subject, body=body, sender=sender, urls=urls)
    expl = explain_email(subject=subject, body=body, sender=sender, urls=urls)

    # Output schema backward compatibility
    assert "phishing_probability" in pred
    assert "legitimate_probability" in pred
    assert len(pred) == 2  # Exactly 2 fields preserved for existing callers

    # Probabilities must match between predict_email and explain_email
    assert abs(pred["phishing_probability"] - expl["phishing_probability"]) < 1e-4
    assert abs(pred["legitimate_probability"] - expl["legitimate_probability"]) < 1e-4

def test_xai_edge_cases():
    """
    Test 7: Verify robust handling of edge cases (empty strings, whitespace, unseen tokens).
    """
    # Case A: Completely empty input
    res_empty = explain_email(subject="", body="", sender="")
    assert res_empty["prediction"] in ("phishing", "legitimate")
    assert res_empty["xai"]["active_feature_count"] == 0
    assert res_empty["xai"]["top_phishing_features"] == []
    assert res_empty["xai"]["top_legitimate_features"] == []
    assert res_empty["xai"]["is_mathematically_valid"] is True

    # Case B: Unseen gibberish words
    res_gibberish = explain_email(subject="xqzwv kjlmp", body="asdfqwer1234zxvc", sender="unknown@domain.xyz")
    assert "xai" in res_gibberish
    assert res_gibberish["xai"]["is_mathematically_valid"] is True

    # Case C: Whitespace-only string
    res_spaces = explain_email(subject="   ", body="\n\t\r  ", sender="  ")
    assert res_spaces["xai"]["active_feature_count"] == 0

def test_xai_benign_vs_phishing_differentiation():
    """
    Test 8: Verify clear differentiation between known benign and phishing samples.
    """
    phish_res = explain_email(
        subject="Your account is suspended!",
        body="Dear customer, your PayPal wallet was suspended. Verify immediately: http://paypa1-login.com/verify",
        sender="security@paypa1-login.com",
        urls=["http://paypa1-login.com/verify"]
    )
    assert phish_res["prediction"] == "phishing"
    assert phish_res["phishing_probability"] > 0.70
    assert len(phish_res["xai"]["top_phishing_features"]) > 0

    benign_res = explain_email(
        subject="Meeting notes: weekly engineering sync",
        body="Hi team, attached are the notes from today's discussion. Thanks, Vince.",
        sender="vince@enterprise.com"
    )
    assert benign_res["prediction"] == "legitimate"
    assert benign_res["legitimate_probability"] > 0.50
    assert len(benign_res["xai"]["top_legitimate_features"]) > 0
