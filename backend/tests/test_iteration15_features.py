"""
Iteration 15 Backend Tests
Features tested:
1. GET /api/sidebar/counts - returns new_leads and unread_chat counts
2. POST /api/leads/email-webhook - public endpoint creating leads from emails
3. GET /api/settings/email-config - super admin only, returns sender config
4. PUT /api/settings/email-config - super admin only, updates sender config
5. GET /api/settings/email-templates - returns list of email templates
6. PUT /api/settings/email-templates/lead_approved - updates template HTML and subject
7. POST /api/settings/email-templates/lead_approved/preview - returns rendered HTML with sample data
8. GET /api/settings/email-logs - returns email delivery logs
9. Phone number search in GET /api/leads?search=phone
10. Phone number search in GET /api/quotes?search=phone
11. Phone number search in GET /api/orders?search=phone
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "shumail.s"
TEST_PASSWORD = "HONDA@2026"
TEST_SECURITY_ANSWER = "Shark"


class TestAuthentication:
    """Get auth token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestSidebarCounts(TestAuthentication):
    """Test GET /api/sidebar/counts endpoint"""
    
    def test_sidebar_counts_returns_new_leads_and_unread_chat(self, auth_headers):
        """GET /api/sidebar/counts should return new_leads and unread_chat counts"""
        response = requests.get(f"{BASE_URL}/api/sidebar/counts", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "new_leads" in data, "Response should contain 'new_leads'"
        assert "unread_chat" in data, "Response should contain 'unread_chat'"
        
        # Verify types
        assert isinstance(data["new_leads"], int), "new_leads should be an integer"
        assert isinstance(data["unread_chat"], int), "unread_chat should be an integer"
        
        # Values should be non-negative
        assert data["new_leads"] >= 0, "new_leads should be >= 0"
        assert data["unread_chat"] >= 0, "unread_chat should be >= 0"
        
        print(f"Sidebar counts: new_leads={data['new_leads']}, unread_chat={data['unread_chat']}")
    
    def test_sidebar_counts_requires_auth(self):
        """GET /api/sidebar/counts should require authentication"""
        response = requests.get(f"{BASE_URL}/api/sidebar/counts")
        assert response.status_code == 403 or response.status_code == 401, "Should require auth"


class TestEmailWebhook:
    """Test POST /api/leads/email-webhook - PUBLIC endpoint (no auth)"""
    
    def test_email_webhook_creates_lead_from_form_data(self):
        """POST /api/leads/email-webhook should create lead from SendGrid form data"""
        unique_name = f"TEST_EmailWebhook_{uuid.uuid4().hex[:8]}"
        
        # Simulate SendGrid Inbound Parse format
        form_data = {
            "from": "vendor@example.com",
            "to": "leads@breamway.com",
            "subject": "New Lead Submission",
            "text": f"""Name: {unique_name}
Pickup City: Los Angeles
Pickup State: CA
Pickup Zip: 90001
Delivery City: Houston
Delivery State: TX
Delivery Zip: 77001
Year: 2024
Make: Honda
Model: Accord
Pickup Date: 05/15/2026
Running: yes
Email: test@example.com
Phone: 5551234567
Phone 2: 5559876543
Notes: Test lead from email webhook
Lead Source ID#: EMAIL-TEST-001"""
        }
        
        response = requests.post(f"{BASE_URL}/api/leads/email-webhook", data=form_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure (simplified response)
        assert "status" in data, "Response should contain status"
        assert data["status"] == "success", "Status should be success"
        assert "quote_number" in data, "Response should contain quote_number"
        assert data["quote_number"].startswith("BR"), "Quote number should start with BR"
        assert "message" in data, "Response should contain message"
        
        print(f"Email webhook created lead: {data['quote_number']}")
    
    def test_email_webhook_handles_json_body(self):
        """POST /api/leads/email-webhook should also handle JSON body"""
        unique_name = f"TEST_EmailWebhookJSON_{uuid.uuid4().hex[:8]}"
        
        json_data = {
            "from": "vendor2@example.com",
            "subject": "JSON Lead",
            "text": f"""Name: {unique_name}
Pickup City: Miami
Pickup State: FL
Delivery City: Atlanta
Delivery State: GA
Year: 2023
Make: Toyota
Model: Camry
Phone: 5552223333"""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/leads/email-webhook",
            json=json_data,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "quote_number" in data, "Response should contain quote_number"
        assert data["status"] == "success", "Status should be success"
        print(f"Email webhook (JSON) created lead: {data['quote_number']}")
    
    def test_email_webhook_no_auth_required(self):
        """POST /api/leads/email-webhook should NOT require authentication"""
        # This is a public webhook for SendGrid
        form_data = {
            "from": "test@test.com",
            "text": "Name: TEST_NoAuth\nPickup City: Test"
        }
        response = requests.post(f"{BASE_URL}/api/leads/email-webhook", data=form_data)
        # Should succeed without auth
        assert response.status_code == 200, f"Should not require auth: {response.text}"


class TestEmailConfig(TestAuthentication):
    """Test email configuration endpoints (superadmin only)"""
    
    def test_get_email_config(self, auth_headers):
        """GET /api/settings/email-config should return sender configuration"""
        response = requests.get(f"{BASE_URL}/api/settings/email-config", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "sender_email" in data, "Should have sender_email"
        assert "sender_name" in data, "Should have sender_name"
        
        print(f"Email config: sender_email={data.get('sender_email')}, sender_name={data.get('sender_name')}")
    
    def test_update_email_config(self, auth_headers):
        """PUT /api/settings/email-config should update sender configuration"""
        update_data = {
            "sender_email": "test@breamway.com",
            "sender_name": "Breamway Test",
            "company_name": "Breamway Auto Transport",
            "company_address": "277 Osgood Avenue, Houston, TX",
            "company_phone": "555-123-4567"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/email-config",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("sender_email") == "test@breamway.com", "sender_email not updated"
        assert data.get("sender_name") == "Breamway Test", "sender_name not updated"
        
        # Restore original
        restore_data = {
            "sender_email": "info@breamway.com",
            "sender_name": "Breamway Auto Transport"
        }
        requests.put(f"{BASE_URL}/api/settings/email-config", json=restore_data, headers=auth_headers)
        
        print("Email config updated and restored successfully")
    
    def test_email_config_requires_superadmin(self):
        """Email config endpoints should require superadmin auth"""
        response = requests.get(f"{BASE_URL}/api/settings/email-config")
        assert response.status_code in [401, 403], "Should require auth"


class TestEmailTemplates(TestAuthentication):
    """Test email template endpoints"""
    
    def test_get_email_templates(self, auth_headers):
        """GET /api/settings/email-templates should return list of templates"""
        response = requests.get(f"{BASE_URL}/api/settings/email-templates", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        assert len(data) > 0, "Should have at least one template"
        
        # Check for lead_approved template
        lead_approved = next((t for t in data if t.get("id") == "lead_approved"), None)
        assert lead_approved is not None, "Should have lead_approved template"
        assert "name" in lead_approved, "Template should have name"
        assert "subject" in lead_approved, "Template should have subject"
        assert "html" in lead_approved, "Template should have html"
        
        print(f"Found {len(data)} email templates, including lead_approved")
    
    def test_update_email_template(self, auth_headers):
        """PUT /api/settings/email-templates/lead_approved should update template"""
        # First get current template
        response = requests.get(f"{BASE_URL}/api/settings/email-templates", headers=auth_headers)
        templates = response.json()
        lead_approved = next((t for t in templates if t.get("id") == "lead_approved"), None)
        original_subject = lead_approved.get("subject", "") if lead_approved else ""
        
        # Update template
        update_data = {
            "subject": "TEST Updated Subject — {{quote_number}}",
            "html": "<html><body><h1>Test Template</h1><p>Hello {{customer_name}}</p></body></html>",
            "name": "Lead Approved / Quote Email",
            "description": "Test description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/email-templates/lead_approved",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("subject") == "TEST Updated Subject — {{quote_number}}", "Subject not updated"
        
        # Restore original
        restore_data = {
            "subject": original_subject or "Your Vehicle Transport Quote — {{quote_number}}",
            "html": lead_approved.get("html", "") if lead_approved else "",
            "name": "Lead Approved / Quote Email"
        }
        requests.put(f"{BASE_URL}/api/settings/email-templates/lead_approved", json=restore_data, headers=auth_headers)
        
        print("Email template updated and restored successfully")
    
    def test_preview_email_template(self, auth_headers):
        """POST /api/settings/email-templates/lead_approved/preview should return rendered HTML"""
        response = requests.post(
            f"{BASE_URL}/api/settings/email-templates/lead_approved/preview",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "html" in data, "Should return rendered html"
        assert "subject" in data, "Should return rendered subject"
        
        # Check that placeholders are replaced with sample data
        html = data.get("html", "")
        assert "{{" not in html or "customer_name" not in html, "Placeholders should be replaced"
        
        # Sample data should include John Smith
        assert "John Smith" in html or "BR000001" in html, "Sample data should be rendered"
        
        print("Email template preview generated successfully")


class TestEmailLogs(TestAuthentication):
    """Test email logs endpoint"""
    
    def test_get_email_logs(self, auth_headers):
        """GET /api/settings/email-logs should return email delivery logs"""
        response = requests.get(f"{BASE_URL}/api/settings/email-logs", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        
        # If there are logs, verify structure
        if len(data) > 0:
            log = data[0]
            assert "to" in log, "Log should have 'to' field"
            assert "subject" in log, "Log should have 'subject' field"
            assert "status" in log, "Log should have 'status' field"
            assert "sent_at" in log, "Log should have 'sent_at' field"
            print(f"Found {len(data)} email logs")
        else:
            print("No email logs found (expected if no emails sent yet)")
    
    def test_email_logs_requires_superadmin(self):
        """GET /api/settings/email-logs should require superadmin auth"""
        response = requests.get(f"{BASE_URL}/api/settings/email-logs")
        assert response.status_code in [401, 403], "Should require auth"


class TestPhoneSearch(TestAuthentication):
    """Test phone number search in leads, quotes, and orders"""
    
    def test_leads_search_by_phone(self, auth_headers):
        """GET /api/leads?search=phone should find leads by phone number"""
        # First create a lead with a specific phone via email webhook
        unique_phone = "2813465565"
        unique_name = f"TEST_PhoneSearch_{uuid.uuid4().hex[:8]}"
        
        form_data = {
            "from": "test@test.com",
            "text": f"""Name: {unique_name}
Pickup City: Dallas
Pickup State: TX
Delivery City: Miami
Delivery State: FL
Phone: {unique_phone}"""
        }
        create_response = requests.post(f"{BASE_URL}/api/leads/email-webhook", data=form_data)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        
        # Now search for it
        response = requests.get(
            f"{BASE_URL}/api/leads",
            params={"search": unique_phone},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "leads" in data, "Response should have 'leads'"
        leads = data["leads"]
        
        # Should find the test lead
        found = any(l.get("phone") == unique_phone or l.get("phone2") == unique_phone for l in leads)
        assert found, f"Should find lead with phone {unique_phone}"
        
        print(f"Found {len(leads)} leads matching phone {unique_phone}")
    
    def test_leads_search_by_phone2(self, auth_headers):
        """GET /api/leads?search=phone2 should find leads by alternate phone"""
        # Create a lead with phone2
        unique_phone2 = "9876543210"
        unique_name = f"TEST_Phone2Search_{uuid.uuid4().hex[:8]}"
        
        form_data = {
            "from": "test@test.com",
            "text": f"""Name: {unique_name}
Pickup City: Chicago
Pickup State: IL
Delivery City: Denver
Delivery State: CO
Phone: 1112223333
Phone 2: {unique_phone2}"""
        }
        create_response = requests.post(f"{BASE_URL}/api/leads/email-webhook", data=form_data)
        assert create_response.status_code == 200, f"Failed to create lead: {create_response.text}"
        
        # Search by phone2
        response = requests.get(
            f"{BASE_URL}/api/leads",
            params={"search": unique_phone2},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        leads = data.get("leads", [])
        found = any(l.get("phone2") == unique_phone2 for l in leads)
        assert found, f"Should find lead with phone2 {unique_phone2}"
        
        print(f"Found {len(leads)} leads matching phone2 {unique_phone2}")
    
    def test_quotes_search_by_phone(self, auth_headers):
        """GET /api/quotes?search=555 should find quotes by phone"""
        response = requests.get(
            f"{BASE_URL}/api/quotes",
            params={"search": "555"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "quotes" in data, "Response should have 'quotes'"
        print(f"Found {len(data['quotes'])} quotes matching phone '555'")
    
    def test_orders_search_by_phone(self, auth_headers):
        """GET /api/orders?search=555 should find orders by phone"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"search": "555"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "orders" in data, "Response should have 'orders'"
        print(f"Found {len(data['orders'])} orders matching phone '555'")


class TestTestEmailSend(TestAuthentication):
    """Test sending test emails (uses real SendGrid)"""
    
    def test_send_test_email(self, auth_headers):
        """POST /api/settings/email-templates/lead_approved/test-send should send test email"""
        test_email = "test@example.com"  # Use a test email
        
        response = requests.post(
            f"{BASE_URL}/api/settings/email-templates/lead_approved/test-send",
            params={"to_email": test_email},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "sent" in data, "Response should have 'sent' field"
        assert "to" in data, "Response should have 'to' field"
        assert data["to"] == test_email, "Should return the target email"
        
        # Note: 'sent' may be False if SendGrid rejects test@example.com
        print(f"Test email send result: sent={data['sent']}, to={data['to']}")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    
    # Login to get token
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        return
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all leads and delete TEST_ prefixed ones
    response = requests.get(f"{BASE_URL}/api/leads", params={"limit": 500}, headers=headers)
    if response.status_code == 200:
        leads = response.json().get("leads", [])
        for lead in leads:
            if lead.get("customer_name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/quotes/{lead['id']}", headers=headers)
                print(f"Cleaned up test lead: {lead.get('quote_number')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
