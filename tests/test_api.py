import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "healthy"]

def test_demo_samples():
    response = client.get("/api/demo/samples")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 8

def test_analyze_master_demo_scenario():
    payload = {
        "raw_content": """From: security@paypa1-login.com
Subject: Your account will be suspended!

Your account has been flagged. Verify your account immediately.
URL: http://paypa1-login.com/verify"""
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["critical_phishing", "phishing"]
    assert data["risk_score"] >= 80.0
    assert data["target_brand"] == "PayPal"
    assert data["attack_type"] == "credential_harvesting"
    assert len(data["indicators"]) >= 3
    assert "iocs" in data
    assert "recommendations" in data

def test_analyze_legitimate_scenario():
    payload = {
        "raw_content": """From: alex.chen@enterprise.com
Subject: Weekly Engineering Team Sync Agenda

Hi team, here is the agenda for our sprint review in Room 4B at 2 PM. Please review Jira board."""
    }
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "legitimate"
    assert data["risk_score"] <= 25.0

def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_analyzed" in data
    assert "verdict_distribution" in data

def test_campaigns_list():
    response = client.get("/api/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert "campaigns" in data

def test_model_metrics():
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "confusion_matrix" in data

def test_ai_explain():
    payload = {
        "question": "Why is this email dangerous?",
        "structured_findings": {
            "verdict": "critical_phishing",
            "risk_score": 92.0,
            "ml_probability": 0.94,
            "target_brand": "PayPal",
            "attack_type": "credential_harvesting",
            "indicators": [
                {"severity": "critical", "title": "Brand Impersonation", "evidence": "paypa1-login.com mimics paypal.com"}
            ]
        }
    }
    response = client.post("/api/ai/explain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["grounded"] is True
