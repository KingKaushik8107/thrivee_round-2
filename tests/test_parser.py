import pytest
from backend.parser.email_parser import EmailParser

def test_parse_simple_rfc822():
    raw = """From: Security Team <security@paypa1-login.com>
To: victim@enterprise.com
Subject: Action Required: Verify Account
Date: Tue, 01 Sep 2026 10:00:00 +0000
Message-ID: <msg-101@paypa1-login.com>

Please verify your credentials at http://paypa1-login.com/verify immediately.
"""
    res = EmailParser.parse_raw_email(raw)
    assert res["sender"] == "security@paypa1-login.com"
    assert res["display_name"] == "Security Team"
    assert res["receiver"] == "victim@enterprise.com"
    assert res["subject"] == "Action Required: Verify Account"
    assert "http://paypa1-login.com/verify" in res["urls"]

def test_parse_heuristic_informal_format():
    informal = """From: alerts@wellsfargo-update.cf
Subject: Account Suspended!
Your account has been locked.
URL: http://wellsfargo-update.cf/login
"""
    res = EmailParser.parse_raw_email(informal)
    assert res["sender"] == "alerts@wellsfargo-update.cf"
    assert res["subject"] == "Account Suspended!"
    assert "http://wellsfargo-update.cf/login" in res["urls"]

def test_parse_html_with_links():
    html_email = """From: support@service.com
Subject: Electronic Document
Content-Type: text/html

<html>
<body>
<p>Please review document <a href="http://evil-server.net/phish">Click Here to Sign</a></p>
</body>
</html>
"""
    res = EmailParser.parse_raw_email(html_email)
    assert "http://evil-server.net/phish" in res["urls"]
    assert len(res["links"]) > 0
    assert res["links"][0]["text"] == "Click Here to Sign"
    assert res["links"][0]["url"] == "http://evil-server.net/phish"

def test_parse_malformed_input():
    # Should not crash on empty or non-standard string
    res = EmailParser.parse_raw_email("Just random unformatted text without any email structure.")
    assert res is not None
    assert "Just random" in res["body"]
