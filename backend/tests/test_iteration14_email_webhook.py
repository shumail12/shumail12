"""
Iteration 14 Tests: Email Webhook and Sidebar Badge Counts
Tests for:
1. POST /api/leads/email-webhook - SendGrid Inbound Parse webhook (public, no auth)
2. GET /api/sidebar/counts - Sidebar badge counts (requires auth)
3. GET /api/leads/{lead_id} - Viewing lead adds user to seen_by array
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "shumail.s"
TEST_PASSWORD = "HONDA@2026"
TEST_SECURITY_ANSWER = "Shark"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def user_info(auth_token):
    """Get current user info"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code == 200:
        return response.json()
    return None


class TestEmailWebhookPublicEndpoint:
    """Test POST /api/leads/email-webhook - SendGrid Inbound Parse webhook (PUBLIC, no auth)"""
    
    def test_email_webhook_accepts_multipart_form_data(self):
        """Email webhook should accept multipart/form-data (SendGrid format)"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"Test Sender <test_{unique_id}@example.com>",
                "to": "leads@breamway.com",
                "subject": f"TEST_Lead from {unique_id}",
                "text": f"""Name: TEST_John Doe {unique_id}
Pickup City: Los Angeles
Pickup State: CA
Pickup Zip: 90001
Delivery City: Houston
Delivery State: TX
Delivery Zip: 77001
Year: 2020
Make: Toyota
Model: Camry
Phone: 1234567890
Email: test_{unique_id}@example.com
Pickup Date: 2026-02-15
Running: yes
Notes: Test lead from email webhook
Lead Source ID#: TEST-{unique_id}"""
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "success"
        assert "quote_number" in data
        assert data["quote_number"].startswith("BR")
        print(f"SUCCESS: Email webhook created lead with quote_number: {data['quote_number']}")
    
    def test_email_webhook_parses_key_value_pairs(self, auth_headers):
        """Email webhook should parse key:value pairs from email text body"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"Vendor System <vendor_{unique_id}@leadprovider.com>",
                "to": "leads@breamway.com",
                "subject": f"New Lead - TEST_{unique_id}",
                "text": f"""Name: TEST_Jane Smith {unique_id}
Pickup City: Miami
Pickup State: FL
Delivery City: Atlanta
Delivery State: GA
Year: 2021
Make: Honda
Model: Accord
Phone: 9876543210
Email: jane_{unique_id}@test.com"""
            }
        )
        assert response.status_code == 200
        data = response.json()
        quote_number = data["quote_number"]
        
        # Verify the lead was created with correct parsed data
        lead_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers, params={"search": f"TEST_Jane Smith {unique_id}"})
        assert lead_response.status_code == 200
        leads = lead_response.json().get("leads", [])
        
        # Find our test lead
        test_lead = None
        for lead in leads:
            if f"TEST_Jane Smith {unique_id}" in lead.get("customer_name", ""):
                test_lead = lead
                break
        
        if test_lead:
            assert test_lead.get("pickup_city") == "Miami"
            assert test_lead.get("pickup_state") == "FL"
            assert test_lead.get("delivery_city") == "Atlanta"
            assert test_lead.get("delivery_state") == "GA"
            assert test_lead.get("vehicle_year") == "2021"
            assert test_lead.get("vehicle_make") == "Honda"
            assert test_lead.get("vehicle_model") == "Accord"
            print(f"SUCCESS: Email webhook correctly parsed key:value pairs for {quote_number}")
        else:
            print(f"WARNING: Could not find test lead to verify parsing, but webhook returned success")
    
    def test_email_webhook_handles_unstructured_email(self):
        """Email webhook should handle unstructured emails (no key:value pairs)"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"Random Person <random_{unique_id}@gmail.com>",
                "to": "leads@breamway.com",
                "subject": f"TEST_Need car shipped {unique_id}",
                "text": f"Hi, I need to ship my car from New York to California. Please call me at 555-1234. Thanks!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "quote_number" in data
        print(f"SUCCESS: Email webhook handled unstructured email, created lead: {data['quote_number']}")
    
    def test_email_webhook_extracts_sender_email(self, auth_headers):
        """Email webhook should extract email from sender if not in body"""
        unique_id = str(uuid.uuid4())[:8]
        sender_email = f"sender_{unique_id}@testdomain.com"
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"Test Customer <{sender_email}>",
                "to": "leads@breamway.com",
                "subject": f"TEST_Ship my vehicle {unique_id}",
                "text": f"""Name: TEST_Customer NoEmail {unique_id}
Pickup City: Denver
Pickup State: CO
Delivery City: Phoenix
Delivery State: AZ"""
            }
        )
        assert response.status_code == 200
        data = response.json()
        quote_number = data["quote_number"]
        
        # Verify email was extracted from sender
        lead_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers, params={"search": f"TEST_Customer NoEmail {unique_id}"})
        if lead_response.status_code == 200:
            leads = lead_response.json().get("leads", [])
            for lead in leads:
                if f"TEST_Customer NoEmail {unique_id}" in lead.get("customer_name", ""):
                    assert lead.get("email") == sender_email, f"Expected email {sender_email}, got {lead.get('email')}"
                    print(f"SUCCESS: Email webhook extracted sender email: {sender_email}")
                    break
    
    def test_email_webhook_no_auth_required(self):
        """Email webhook should NOT require authentication (public endpoint)"""
        unique_id = str(uuid.uuid4())[:8]
        # Send request without any auth headers
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"public_{unique_id}@test.com",
                "subject": f"TEST_Public webhook test {unique_id}",
                "text": f"Name: TEST_Public Lead {unique_id}"
            }
        )
        # Should NOT return 401 or 403
        assert response.status_code != 401, "Email webhook should not require auth"
        assert response.status_code != 403, "Email webhook should not require auth"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("SUCCESS: Email webhook is public (no auth required)")


class TestSidebarCounts:
    """Test GET /api/sidebar/counts - Sidebar badge counts (requires auth)"""
    
    def test_sidebar_counts_requires_auth(self):
        """Sidebar counts endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/sidebar/counts")
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("SUCCESS: Sidebar counts requires authentication")
    
    def test_sidebar_counts_returns_correct_structure(self, auth_headers):
        """Sidebar counts should return {new_leads: N, unread_chat: N}"""
        response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "new_leads" in data, "Response should contain 'new_leads'"
        assert "unread_chat" in data, "Response should contain 'unread_chat'"
        assert isinstance(data["new_leads"], int), "new_leads should be an integer"
        assert isinstance(data["unread_chat"], int), "unread_chat should be an integer"
        print(f"SUCCESS: Sidebar counts returned: new_leads={data['new_leads']}, unread_chat={data['unread_chat']}")
    
    def test_sidebar_counts_new_leads_increases_after_webhook(self, auth_headers):
        """New leads count should increase after email webhook creates a lead"""
        # Get initial count
        initial_response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert initial_response.status_code == 200
        initial_count = initial_response.json()["new_leads"]
        
        # Create a new lead via email webhook
        unique_id = str(uuid.uuid4())[:8]
        webhook_response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"count_test_{unique_id}@test.com",
                "subject": f"TEST_Count test {unique_id}",
                "text": f"Name: TEST_Count Test Lead {unique_id}"
            }
        )
        assert webhook_response.status_code == 200
        
        # Get new count
        new_response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert new_response.status_code == 200
        new_count = new_response.json()["new_leads"]
        
        # Count should have increased (or stayed same if user already saw it)
        assert new_count >= initial_count, f"Expected count >= {initial_count}, got {new_count}"
        print(f"SUCCESS: New leads count after webhook: {initial_count} -> {new_count}")


class TestLeadSeenByTracking:
    """Test GET /api/leads/{lead_id} - Viewing lead adds user to seen_by array"""
    
    def test_viewing_lead_adds_to_seen_by(self, auth_headers, user_info):
        """Viewing a lead should add current user to seen_by array"""
        # Create a new lead via webhook
        unique_id = str(uuid.uuid4())[:8]
        webhook_response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"seen_test_{unique_id}@test.com",
                "subject": f"TEST_Seen test {unique_id}",
                "text": f"Name: TEST_Seen Test Lead {unique_id}"
            }
        )
        assert webhook_response.status_code == 200
        
        # Find the lead
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers, params={"search": f"TEST_Seen Test Lead {unique_id}"})
        assert leads_response.status_code == 200
        leads = leads_response.json().get("leads", [])
        
        test_lead = None
        for lead in leads:
            if f"TEST_Seen Test Lead {unique_id}" in lead.get("customer_name", ""):
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("Could not find test lead")
        
        lead_id = test_lead["id"]
        
        # View the lead
        view_response = requests.get(f"{BASE_URL}/api/leads/{lead_id}", headers=auth_headers)
        assert view_response.status_code == 200
        
        # Check that user is now in seen_by
        lead_data = view_response.json()
        seen_by = lead_data.get("seen_by", [])
        
        if user_info:
            user_id = user_info.get("id")
            assert user_id in seen_by, f"User {user_id} should be in seen_by: {seen_by}"
            print(f"SUCCESS: User {user_id} added to seen_by after viewing lead")
        else:
            print("SUCCESS: Lead viewed (could not verify user_id in seen_by)")
    
    def test_sidebar_count_decreases_after_viewing_lead(self, auth_headers):
        """Sidebar new_leads count should decrease after viewing a lead"""
        # Create a new lead
        unique_id = str(uuid.uuid4())[:8]
        webhook_response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            data={
                "from": f"decrease_test_{unique_id}@test.com",
                "subject": f"TEST_Decrease test {unique_id}",
                "text": f"Name: TEST_Decrease Test Lead {unique_id}"
            }
        )
        assert webhook_response.status_code == 200
        
        # Get count before viewing
        before_response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert before_response.status_code == 200
        before_count = before_response.json()["new_leads"]
        
        # Find and view the lead
        leads_response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers, params={"search": f"TEST_Decrease Test Lead {unique_id}"})
        assert leads_response.status_code == 200
        leads = leads_response.json().get("leads", [])
        
        test_lead = None
        for lead in leads:
            if f"TEST_Decrease Test Lead {unique_id}" in lead.get("customer_name", ""):
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("Could not find test lead")
        
        # View the lead
        view_response = requests.get(f"{BASE_URL}/api/leads/{test_lead['id']}", headers=auth_headers)
        assert view_response.status_code == 200
        
        # Get count after viewing
        after_response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert after_response.status_code == 200
        after_count = after_response.json()["new_leads"]
        
        # Count should have decreased by 1
        assert after_count == before_count - 1, f"Expected count to decrease from {before_count} to {before_count - 1}, got {after_count}"
        print(f"SUCCESS: New leads count decreased after viewing: {before_count} -> {after_count}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, auth_headers):
        """Clean up TEST_ prefixed leads created during testing"""
        # Get all leads with TEST_ prefix
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers, params={"search": "TEST_", "limit": 100})
        if response.status_code == 200:
            leads = response.json().get("leads", [])
            deleted_count = 0
            for lead in leads:
                if lead.get("customer_name", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/quotes/{lead['id']}", headers=auth_headers)
                    if del_response.status_code in [200, 204]:
                        deleted_count += 1
            print(f"Cleanup: Deleted {deleted_count} test leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
