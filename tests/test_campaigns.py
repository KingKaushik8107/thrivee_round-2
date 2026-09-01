import pytest
from backend.correlation.similarity import EmailSimilarityEngine

def test_email_similarity_related():
    email_a = {
        "sender": "security@paypa1-login.com",
        "subject": "Your account will be suspended!",
        "body": "Your account has been flagged. Verify your credentials immediately.",
        "target_brand": "PayPal",
        "urls": ["http://paypa1-login.com/verify"]
    }
    email_b = {
        "sender": "alerts@paypa1-login.com",
        "subject": "Immediate Action Required: Account Suspension Notice",
        "body": "Your PayPal account is flagged. Please verify credentials now.",
        "target_brand": "PayPal",
        "urls": ["http://paypa1-login.com/verify"]
    }
    res = EmailSimilarityEngine.compute_similarity(email_a, email_b)
    assert res["is_related"] is True
    assert res["similarity_percentage"] >= 80

def test_email_similarity_unrelated():
    email_phish = {
        "sender": "security@paypa1-login.com",
        "subject": "Your account will be suspended!",
        "body": "Verify immediately at http://paypa1-login.com/verify",
        "target_brand": "PayPal",
        "urls": ["http://paypa1-login.com/verify"]
    }
    email_legit = {
        "sender": "alex@enterprise.com",
        "subject": "Weekly Engineering Team Meeting",
        "body": "Hi team, see you in Room 4B for the sprint review.",
        "target_brand": None,
        "urls": []
    }
    res = EmailSimilarityEngine.compute_similarity(email_phish, email_legit)
    assert res["is_related"] is False
    assert res["similarity_percentage"] < 35
