import pytest
from backend.analyzers import (
    SenderAnalyzer, DomainAnalyzer, BrandAnalyzer, URLAnalyzer, ContentAnalyzer, AttachmentAnalyzer, AttackTypeClassifier
)

def test_sender_analyzer_display_name_mismatch():
    parsed = {
        "sender": "attacker@random-mail.xyz",
        "display_name": "PayPal Customer Security",
        "reply_to": "",
        "headers": {}
    }
    indicators = SenderAnalyzer.analyze(parsed)
    codes = [i["indicator_code"] for i in indicators]
    assert "DISPLAY_NAME_BRAND_MISMATCH" in codes

def test_sender_analyzer_free_email_spoof():
    parsed = {
        "sender": "security-paypal@gmail.com",
        "display_name": "PayPal Support",
        "reply_to": "",
        "headers": {}
    }
    indicators = SenderAnalyzer.analyze(parsed)
    codes = [i["indicator_code"] for i in indicators]
    assert "FREE_EMAIL_FOR_OFFICIAL_ROLE" in codes

def test_domain_analyzer_punycode_and_tld():
    indicators = DomainAnalyzer.analyze_domain("xn--pypal-4ve.top")
    codes = [i["indicator_code"] for i in indicators]
    assert "PUNYCODE_IDN_HOMOGRAPH" in codes
    assert "HIGH_RISK_TLD" in codes

def test_brand_analyzer_typosquatting_paypal():
    match, indicators = BrandAnalyzer.analyze_domain("paypa1-login.com")
    assert match is not None
    assert match["brand"] == "PayPal"
    assert match["similarity"] >= 0.85
    assert len(indicators) > 0
    assert indicators[0]["severity"] in ["critical", "high"]

def test_brand_analyzer_legitimate_paypal():
    match, indicators = BrandAnalyzer.analyze_domain("paypal.com")
    # Legitimate brand domain should not produce impersonation indicator
    assert match is None
    assert len(indicators) == 0

def test_url_analyzer_ip_host_and_link_mismatch():
    urls = ["http://192.168.1.50/login", "http://paypa1-login.com/verify"]
    links = [{"text": "https://www.paypal.com/signin", "url": "http://paypa1-login.com/verify"}]
    indicators = URLAnalyzer.analyze_urls(urls, links)
    codes = [i["indicator_code"] for i in indicators]
    assert "IP_ADDRESS_IN_URL" in codes
    assert "LINK_DESTINATION_MISMATCH" in codes

def test_content_analyzer_urgency_and_threat():
    indicators = ContentAnalyzer.analyze_content(
        subject="Your account will be suspended!",
        body="Verify your password immediately within 24 hours or access will be permanently revoked."
    )
    codes = [i["indicator_code"] for i in indicators]
    assert "URGENT_CALL_TO_ACTION" in codes
    assert "ACCOUNT_SUSPENSION_THREAT" in codes
    assert "CREDENTIAL_HARVESTING_SOLICITATION" in codes

def test_attachment_analyzer_double_extension():
    attachments = [
        {"filename": "remittance_invoice.pdf.exe", "extension": "exe", "content_type": "application/x-dosexec"}
    ]
    indicators = AttachmentAnalyzer.analyze_attachments(attachments)
    codes = [i["indicator_code"] for i in indicators]
    assert "DECEPTIVE_DOUBLE_EXTENSION" in codes
    assert "EXECUTABLE_BINARY_PAYLOAD" in codes

def test_attack_type_classifier():
    indicators = [
        {"source": "brand_analysis", "indicator_code": "BRAND_LOOKALIKE_DOMAIN"},
        {"source": "url_analysis", "indicator_code": "LINK_DESTINATION_MISMATCH"},
        {"source": "content_analysis", "indicator_code": "CREDENTIAL_HARVESTING_SOLICITATION"}
    ]
    res = AttackTypeClassifier.classify({}, indicators, {"brand": "PayPal", "detected_domain": "paypa1-login.com"})
    assert res["attack_type"] == "credential_harvesting"
    assert res["confidence"] >= 0.8
