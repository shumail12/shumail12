"""
Iteration 13 Tests: Email Lead Delivery, Reminder Calendar, and API Route Fixes
Tests for:
1. GET /api/settings/lead-email - returns generated lead delivery email address
2. POST /api/settings/lead-email/regenerate - generates new email address
3. POST /api/leads/email-incoming - parses plain-text email format and creates lead
4. GET /api/leads/incoming - browser GET redirects (302) to /api/vendor/docs
5. GET /api/leads/specs - returns JSON specs publicly (no auth needed)
6. GET /api/vendor/docs - returns HTML documentation page (no auth needed)
7. POST /api/reminders - create reminder
8. GET /api/reminders - list reminders with filters
9. GET /api/reminders/today - today's reminders
10. PUT /api/reminders/{id} - update reminder
11. DELETE /api/reminders/{id} - delete reminder
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "shumail.s"
TEST_PASSWORD = "HONDA@2026"
VENDOR_API_KEY = "brw-00ab50ce5fd46030e8ab0be1a4d6d1a6"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for superadmin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestLeadEmailDelivery:
    """Tests for email-based lead delivery feature"""

    def test_get_lead_email(self, auth_headers):
        """GET /api/settings/lead-email - returns generated lead delivery email"""
        response = requests.get(f"{BASE_URL}/api/settings/lead-email", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "email" in data, "Response should contain 'email' field"
        assert "@leads.breamway.com" in data["email"], "Email should be @leads.breamway.com domain"
        assert "email_id" in data, "Response should contain 'email_id' field"

    def test_regenerate_lead_email(self, auth_headers):
        """POST /api/settings/lead-email/regenerate - generates new email address"""
        # Get current email
        response1 = requests.get(f"{BASE_URL}/api/settings/lead-email", headers=auth_headers)
        old_email = response1.json()["email"]
        
        # Regenerate
        response = requests.post(f"{BASE_URL}/api/settings/lead-email/regenerate", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "email" in data
        assert "@leads.breamway.com" in data["email"]
        assert data["email"] != old_email, "New email should be different from old email"

    def test_email_incoming_creates_lead(self):
        """POST /api/leads/email-incoming - parses plain-text email format and creates lead"""
        email_body = """Name: TEST_EmailLead John
Pickup City: Los Angeles
Pickup State: CA
Pickup Zip: 90001
Delivery City: Houston
Delivery State: TX
Delivery Zip: 77001
Year: 2022
Make: Honda
Model: Civic
Pickup Date: 04/30/2026
Running: true
Email: test@example.com
Phone: 555-123-4567
Phone 2: 555-987-6543
Notes: Test email lead intake
Lead Source ID#: TEST-EMAIL-001"""

        response = requests.post(
            f"{BASE_URL}/api/leads/email-incoming",
            headers={"X-API-Key": VENDOR_API_KEY, "Content-Type": "application/json"},
            json={"body": email_body}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["status"] == "success"
        assert "quote_number" in data
        assert "quote_id" in data
        assert data["message"] == "Email lead received"

    def test_email_incoming_requires_api_key(self):
        """POST /api/leads/email-incoming - requires valid API key"""
        response = requests.post(
            f"{BASE_URL}/api/leads/email-incoming",
            headers={"Content-Type": "application/json"},
            json={"body": "Name: Test"}
        )
        assert response.status_code == 401, "Should require API key"

    def test_email_incoming_invalid_api_key(self):
        """POST /api/leads/email-incoming - rejects invalid API key"""
        response = requests.post(
            f"{BASE_URL}/api/leads/email-incoming",
            headers={"X-API-Key": "invalid-key", "Content-Type": "application/json"},
            json={"body": "Name: Test"}
        )
        assert response.status_code == 401, "Should reject invalid API key"


class TestVendorAPIRoutes:
    """Tests for vendor API documentation routes"""

    def test_leads_specs_public_no_auth(self):
        """GET /api/leads/specs - returns JSON specs publicly (no auth needed)"""
        response = requests.get(f"{BASE_URL}/api/leads/specs")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "endpoint" in data
        assert "method" in data
        assert data["method"] == "POST"
        assert "authentication" in data
        assert "required_fields" in data
        assert "all_fields" in data
        assert "sample_request" in data
        assert "sample_response_success" in data

    def test_vendor_docs_public_html(self):
        """GET /api/vendor/docs - returns HTML documentation page (no auth needed)"""
        response = requests.get(f"{BASE_URL}/api/vendor/docs")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "text/html" in response.headers.get("content-type", "")
        assert "Breamway Auto Transport" in response.text
        assert "Lead Intake API" in response.text or "Lead API" in response.text

    def test_leads_incoming_get_redirects(self):
        """GET /api/leads/incoming - browser GET redirects (302) to /api/vendor/docs"""
        response = requests.get(f"{BASE_URL}/api/leads/incoming", allow_redirects=False)
        assert response.status_code == 302, f"Expected 302 redirect, got {response.status_code}"
        assert "/api/vendor/docs" in response.headers.get("location", "")


class TestReminderCRUD:
    """Tests for reminder calendar CRUD operations"""

    @pytest.fixture(autouse=True)
    def setup(self, auth_headers):
        self.auth_headers = auth_headers
        self.created_reminder_ids = []

    def test_create_reminder(self, auth_headers):
        """POST /api/reminders - create reminder with all fields"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {
            "title": "TEST_Reminder Pickup for John",
            "notes": "Call customer at 9am",
            "reminder_date": today,
            "reminder_type": "pickup",
            "order_number": "ORD000001",
            "quote_number": "BR000001"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", headers=auth_headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["notes"] == payload["notes"]
        assert data["reminder_date"] == today
        assert data["reminder_type"] == "pickup"
        assert data["status"] == "pending"
        assert "id" in data
        assert "user_id" in data
        assert "user_name" in data
        # Store for cleanup
        self.created_reminder_ids.append(data["id"])
        return data["id"]

    def test_create_reminder_dispatch_type(self, auth_headers):
        """POST /api/reminders - create dispatch type reminder"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {
            "title": "TEST_Dispatch reminder",
            "reminder_date": today,
            "reminder_type": "dispatch"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["reminder_type"] == "dispatch"
        self.created_reminder_ids.append(data["id"])

    def test_create_reminder_follow_up_type(self, auth_headers):
        """POST /api/reminders - create follow_up type reminder"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {
            "title": "TEST_Follow up call",
            "reminder_date": today,
            "reminder_type": "follow_up"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["reminder_type"] == "follow_up"
        self.created_reminder_ids.append(data["id"])

    def test_create_reminder_custom_type(self, auth_headers):
        """POST /api/reminders - create custom type reminder"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        payload = {
            "title": "TEST_Custom reminder",
            "reminder_date": today,
            "reminder_type": "custom"
        }
        response = requests.post(f"{BASE_URL}/api/reminders", headers=auth_headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["reminder_type"] == "custom"
        self.created_reminder_ids.append(data["id"])

    def test_get_reminders_list(self, auth_headers):
        """GET /api/reminders - list reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "reminders" in data
        assert "total" in data
        assert isinstance(data["reminders"], list)

    def test_get_reminders_with_date_filter(self, auth_headers):
        """GET /api/reminders - list reminders with date range filter"""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/reminders",
            headers=auth_headers,
            params={"start_date": today, "end_date": today}
        )
        assert response.status_code == 200
        data = response.json()
        assert "reminders" in data
        # All returned reminders should be for today
        for r in data["reminders"]:
            assert r["reminder_date"] == today

    def test_get_reminders_with_status_filter(self, auth_headers):
        """GET /api/reminders - list reminders with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/reminders",
            headers=auth_headers,
            params={"status": "pending"}
        )
        assert response.status_code == 200
        data = response.json()
        for r in data["reminders"]:
            assert r["status"] == "pending"

    def test_get_today_reminders(self, auth_headers):
        """GET /api/reminders/today - today's reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders/today", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "reminders" in data
        assert "date" in data
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert data["date"] == today

    def test_update_reminder(self, auth_headers):
        """PUT /api/reminders/{id} - update reminder"""
        # First create a reminder
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        create_response = requests.post(
            f"{BASE_URL}/api/reminders",
            headers=auth_headers,
            json={"title": "TEST_Update me", "reminder_date": today, "reminder_type": "custom"}
        )
        reminder_id = create_response.json()["id"]
        self.created_reminder_ids.append(reminder_id)

        # Update it
        update_payload = {
            "title": "TEST_Updated title",
            "notes": "Updated notes",
            "status": "completed"
        }
        response = requests.put(
            f"{BASE_URL}/api/reminders/{reminder_id}",
            headers=auth_headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Updated title"
        assert data["notes"] == "Updated notes"
        assert data["status"] == "completed"

    def test_update_reminder_not_found(self, auth_headers):
        """PUT /api/reminders/{id} - returns 404 for non-existent reminder"""
        response = requests.put(
            f"{BASE_URL}/api/reminders/nonexistent-id",
            headers=auth_headers,
            json={"title": "Test"}
        )
        assert response.status_code == 404

    def test_delete_reminder(self, auth_headers):
        """DELETE /api/reminders/{id} - delete reminder"""
        # First create a reminder
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        create_response = requests.post(
            f"{BASE_URL}/api/reminders",
            headers=auth_headers,
            json={"title": "TEST_Delete me", "reminder_date": today, "reminder_type": "custom"}
        )
        reminder_id = create_response.json()["id"]

        # Delete it
        response = requests.delete(f"{BASE_URL}/api/reminders/{reminder_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.json()["message"] == "Reminder deleted"

        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        reminders = get_response.json()["reminders"]
        assert not any(r["id"] == reminder_id for r in reminders)

    def test_delete_reminder_not_found(self, auth_headers):
        """DELETE /api/reminders/{id} - returns 404 for non-existent reminder"""
        response = requests.delete(f"{BASE_URL}/api/reminders/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404


class TestReminderPermissions:
    """Tests for reminder permission rules"""

    def test_admin_sees_all_reminders(self, auth_headers):
        """GET /api/reminders - admin/superadmin sees all agents' reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200
        # Superadmin should be able to see reminders (no user_id filter applied)
        data = response.json()
        assert "reminders" in data

    def test_admin_can_filter_by_user(self, auth_headers):
        """GET /api/reminders - admin can filter by user_id"""
        response = requests.get(
            f"{BASE_URL}/api/reminders",
            headers=auth_headers,
            params={"user_id": "some-user-id"}
        )
        assert response.status_code == 200


class TestCleanup:
    """Cleanup test data"""

    def test_cleanup_test_reminders(self, auth_headers):
        """Clean up TEST_ prefixed reminders"""
        response = requests.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        if response.status_code == 200:
            reminders = response.json().get("reminders", [])
            for r in reminders:
                if r.get("title", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/reminders/{r['id']}", headers=auth_headers)

    def test_cleanup_test_leads(self, auth_headers):
        """Clean up TEST_ prefixed leads from email intake"""
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        if response.status_code == 200:
            leads = response.json().get("leads", [])
            for lead in leads:
                if lead.get("customer_name", "").startswith("TEST_"):
                    # Note: There's no delete lead endpoint, so we just skip
                    pass
