import pytest
from backend.ml.predict import predict_email
from backend.ml.preprocess import clean_text, combine_email_fields
from backend.ml.model import PhishingClassifier

def test_clean_text():
    raw = "  Hello \n\n world\t!  "
    assert clean_text(raw) == "Hello world !"

def test_combine_email_fields():
    text = combine_email_fields(
        subject="Alert",
        body="Verify your account.",
        sender="admin@test.com",
        urls=["http://test.com/login"]
    )
    assert "SUBJECT: Alert" in text
    assert "BODY: Verify your account." in text
    assert "FROM: admin@test.com" in text
    assert "LINKS: http://test.com/login" in text

def test_predict_email_phishing():
    res = predict_email(
        subject="Your account will be suspended!",
        body="Verify your password immediately to avoid suspension at http://paypa1-login.com/verify",
        sender="security@paypa1-login.com",
        urls=["http://paypa1-login.com/verify"]
    )
    assert "phishing_probability" in res
    assert "legitimate_probability" in res
    assert res["phishing_probability"] >= 0.70

def test_predict_email_benign():
    res = predict_email(
        subject="Weekly Engineering Sprint Agenda",
        body="Hi team, here are the meeting notes for our sprint review on Thursday in Room 4B.",
        sender="alex@enterprise.com",
        urls=[]
    )
    assert res["phishing_probability"] <= 0.35
