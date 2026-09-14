import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.fixture(scope="module")
def created_incident_id():
    payload = {
        "sender": "security@paypal-security-update.com",
        "receiver": "victim@targetorg.com",
        "subject": "Urgent: PayPal Account Security Alert",
        "body": "Dear customer, your PayPal account has been locked. Verify immediately at http://paypal-update.phishing.com to restore access."
    }
    res = client.post("/api/analyze", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "incident_id" in data
    assert data.get("status") == "new"
    assert "timeline" in data
    assert len(data["timeline"]) >= 3
    return data["incident_id"]

def test_incident_status_update_valid(created_incident_id):
    # Transition to 'investigating'
    res1 = client.patch(f"/api/incidents/{created_incident_id}/status", json={
        "status": "investigating",
        "analyst_name": "Tier-2 Analyst",
        "reason": "Investigating suspicious paypal link mismatch."
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert data1["new_status"] == "investigating"

    # Verify retrieval reflects new status
    get_res = client.get(f"/api/incidents/{created_incident_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "investigating"

    # Transition to 'confirmed_threat'
    res2 = client.patch(f"/api/incidents/{created_incident_id}/status", json={
        "status": "confirmed_threat",
        "analyst_name": "Lead SOC Specialist",
        "reason": "Confirmed credential harvester targeting PayPal."
    })
    assert res2.status_code == 200
    assert res2.json()["new_status"] == "confirmed_threat"

    # Transition to 'resolved'
    res3 = client.patch(f"/api/incidents/{created_incident_id}/status", json={
        "status": "resolved",
        "analyst_name": "Lead SOC Specialist",
        "reason": "Firewall block rules deployed."
    })
    assert res3.status_code == 200
    assert res3.json()["new_status"] == "resolved"

def test_incident_status_update_invalid(created_incident_id):
    # Attempt invalid status
    res = client.patch(f"/api/incidents/{created_incident_id}/status", json={
        "status": "not_a_valid_status",
        "analyst_name": "Analyst"
    })
    assert res.status_code == 422

def test_add_and_get_analyst_notes(created_incident_id):
    # Add note 1
    note1_res = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst Alice",
        "note_text": "Examined payload domain. Registered 2 days ago via Namecheap."
    })
    assert note1_res.status_code == 201
    note1 = note1_res.json()
    assert note1["analyst_name"] == "Analyst Alice"
    assert "Registered 2 days ago" in note1["note_text"]

    # Add note 2
    note2_res = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst Bob",
        "note_text": "Block rule requested on perimeter proxy."
    })
    assert note2_res.status_code == 201

    # Retrieve notes
    get_notes = client.get(f"/api/incidents/{created_incident_id}/notes")
    assert get_notes.status_code == 200
    notes_list = get_notes.json()
    assert len(notes_list) >= 2
    # Check descending order
    assert notes_list[0]["analyst_name"] == "Analyst Bob"
    assert notes_list[1]["analyst_name"] == "Analyst Alice"

def test_empty_note_validation(created_incident_id):
    # Empty note text should fail validation
    res = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst Alice",
        "note_text": ""
    })
    assert res.status_code == 422

def test_investigation_timeline_events(created_incident_id):
    timeline_res = client.get(f"/api/incidents/{created_incident_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 4

    event_types = [e["event_type"] for e in events]
    assert "created" in event_types
    assert "ml_inference" in event_types
    assert "forensic_rules" in event_types
    assert "status_change" in event_types
    assert "analyst_note" in event_types

def test_feedback_submission_records_timeline(created_incident_id):
    fb_res = client.post(f"/api/incidents/{created_incident_id}/feedback", json={
        "feedback": "confirmed_phishing",
        "analyst_name": "SOC Manager",
        "notes": "Verified against threat feed"
    })
    assert fb_res.status_code == 200

    timeline_res = client.get(f"/api/incidents/{created_incident_id}/timeline")
    events = timeline_res.json()
    feedback_events = [e for e in events if e["event_type"] == "feedback"]
    assert len(feedback_events) >= 1
    assert "Confirmed Phishing" in feedback_events[-1]["title"]

def test_delete_note_success(created_incident_id):
    # Create note specifically for deletion test
    add_res = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst Charlie",
        "note_text": "Temporary note to be deleted."
    })
    assert add_res.status_code == 201
    note_id = add_res.json()["id"]

    # Delete the note
    del_res = client.delete(f"/api/incidents/{created_incident_id}/notes/{note_id}")
    assert del_res.status_code == 200
    data = del_res.json()
    assert data["status"] == "success"
    assert data["note_id"] == note_id

    # Verify note no longer appears in GET notes
    get_res = client.get(f"/api/incidents/{created_incident_id}/notes")
    assert get_res.status_code == 200
    current_ids = [n["id"] for n in get_res.json()]
    assert note_id not in current_ids

def test_cannot_delete_note_belonging_to_another_incident(created_incident_id):
    # Create a secondary incident
    second_res = client.post("/api/analyze", json={
        "sender": "alerts@internal-corp.com",
        "receiver": "analyst@targetorg.com",
        "subject": "System Notice",
        "body": "Routine maintenance notice."
    })
    assert second_res.status_code == 200
    incident_2_id = second_res.json()["incident_id"]

    # Add note to incident 2
    note_res = client.post(f"/api/incidents/{incident_2_id}/notes", json={
        "analyst_name": "Analyst Dan",
        "note_text": "Incident 2 confidential note."
    })
    assert note_res.status_code == 201
    note_2_id = note_res.json()["id"]

    # Attempt to delete incident 2's note using incident 1's URL
    cross_del = client.delete(f"/api/incidents/{created_incident_id}/notes/{note_2_id}")
    assert cross_del.status_code == 400
    assert "does not belong" in cross_del.json()["detail"].lower()

    # Verify note is still intact on incident 2
    inc2_notes = client.get(f"/api/incidents/{incident_2_id}/notes").json()
    assert any(n["id"] == note_2_id for n in inc2_notes)

def test_delete_nonexistent_note(created_incident_id):
    res = client.delete(f"/api/incidents/{created_incident_id}/notes/non-existent-uuid-99999")
    assert res.status_code == 404

def test_deleting_one_note_preserves_other_notes(created_incident_id):
    # Add note A and note B
    note_a = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst A",
        "note_text": "Keep this permanent note."
    }).json()

    note_b = client.post(f"/api/incidents/{created_incident_id}/notes", json={
        "analyst_name": "Analyst B",
        "note_text": "Delete this specific note only."
    }).json()

    # Delete Note B
    del_res = client.delete(f"/api/incidents/{created_incident_id}/notes/{note_b['id']}")
    assert del_res.status_code == 200

    # Verify Note A remains persistent
    notes = client.get(f"/api/incidents/{created_incident_id}/notes").json()
    note_ids = [n["id"] for n in notes]
    assert note_a["id"] in note_ids
    assert note_b["id"] not in note_ids

def test_incident_intact_after_note_deletion(created_incident_id):
    # Fetch full incident
    get_res = client.get(f"/api/incidents/{created_incident_id}")
    assert get_res.status_code == 200
    inc = get_res.json()
    assert inc["verdict"] in ["critical_phishing", "phishing", "suspicious", "legitimate"]
    assert inc["risk_score"] > 0
    assert inc["ml_probability"] > 0
    assert inc["status"] in ["new", "investigating", "confirmed_threat", "resolved"]

def test_incident_resolution_variants():
    from backend.database.database import SessionLocal
    from backend.database.models import AnalysisResult

    # Create fresh incident with 0 initial notes
    res = client.post("/api/analyze", json={
        "sender": "billing@secure-microsoft-portal.com",
        "receiver": "finance@targetorg.com",
        "subject": "Microsoft 365 Invoice Pending",
        "body": "Your subscription expired. Renew immediately at http://login-microsoft-renew.com"
    })
    assert res.status_code == 200
    data = res.json()
    email_id = data["incident_id"]

    db = SessionLocal()
    try:
        ar = db.query(AnalysisResult).filter(AnalysisResult.email_id == email_id).first()
        analysis_id = ar.id
    finally:
        db.close()

    # 1. Verify fresh incident starts with 0 notes and GET returns []
    notes_init = client.get(f"/api/incidents/{email_id}/notes")
    assert notes_init.status_code == 200
    assert notes_init.json() == []

    # 2. Add first note using direct EmailRecord.id
    n1_res = client.post(f"/api/incidents/{email_id}/notes", json={
        "analyst_name": "Analyst One",
        "note_text": "First note on brand new incident."
    })
    assert n1_res.status_code == 201
    assert n1_res.json()["analyst_name"] == "Analyst One"

    # 3. Add note using INC- prefix formatted ID (e.g. INC-b239aa65 or INC-{email_id})
    inc_prefix_id = f"INC-{email_id[:8]}"
    n2_res = client.post(f"/api/incidents/{inc_prefix_id}/notes", json={
        "analyst_name": "Analyst Two",
        "note_text": "Note added via INC- prefix identifier."
    })
    assert n2_res.status_code == 201

    # 4. Add note using AnalysisResult.id
    n3_res = client.post(f"/api/incidents/{analysis_id}/notes", json={
        "analyst_name": "Analyst Three",
        "note_text": "Note added via AnalysisResult.id."
    })
    assert n3_res.status_code == 201

    # 5. Add note using short hex prefix
    short_hex = email_id[:10]
    n4_res = client.post(f"/api/incidents/{short_hex}/notes", json={
        "analyst_name": "Analyst Four",
        "note_text": "Note added via short hex prefix."
    })
    assert n4_res.status_code == 201

    # 6. Verify GET notes works across all identifier formats
    assert len(client.get(f"/api/incidents/{email_id}/notes").json()) == 4
    assert len(client.get(f"/api/incidents/{inc_prefix_id}/notes").json()) == 4
    assert len(client.get(f"/api/incidents/{analysis_id}/notes").json()) == 4
    assert len(client.get(f"/api/incidents/{short_hex}/notes").json()) == 4

    # 7. Verify non-existent ID returns 404
    bad_res = client.post("/api/incidents/00000000-0000-0000-0000-000000000000/notes", json={
        "analyst_name": "Ghost Analyst",
        "note_text": "This should 404"
    })
    assert bad_res.status_code == 404

