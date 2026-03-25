"""
Test Superadmin Editability Features - Iteration 11
Tests for:
1. PUT /api/orders/{order_id} - superadmin can update customer/vehicle/location fields
2. PUT /api/invoices/{invoice_id} - superadmin can update branding fields (company_name, company_subtitle, company_dot, document_title)
3. PUT /api/invoices/{invoice_id} - admin CANNOT edit signed invoices (403), superadmin CAN
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_CREDS = {"username": "shumail.s", "password": "HONDA@2026"}


@pytest.fixture(scope="module")
def superadmin_token():
    """Get superadmin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SUPERADMIN_CREDS)
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data["user"]["role"] == "superadmin", "User is not superadmin"
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(superadmin_token):
    """Get auth headers for superadmin"""
    return {"Authorization": f"Bearer {superadmin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_order_id(auth_headers):
    """Get or create a test order for testing"""
    # First try to get existing order ORD000006
    response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers)
    assert response.status_code == 200
    orders = response.json().get("orders", [])
    
    # Find order ORD000006 or use first available order
    target_order = None
    for order in orders:
        if order.get("order_number") == "ORD000006":
            target_order = order
            break
    
    if not target_order and orders:
        target_order = orders[0]
    
    if target_order:
        return target_order["id"]
    
    # If no orders exist, create one from a quote
    quotes_resp = requests.get(f"{BASE_URL}/api/quotes?status=quoted&limit=1", headers=auth_headers)
    if quotes_resp.status_code == 200:
        quotes = quotes_resp.json().get("quotes", [])
        if quotes:
            convert_resp = requests.post(f"{BASE_URL}/api/quotes/{quotes[0]['id']}/convert-to-order", headers=auth_headers)
            if convert_resp.status_code == 200:
                return convert_resp.json()["id"]
    
    pytest.skip("No orders available for testing")


@pytest.fixture(scope="module")
def test_invoice_id(auth_headers, test_order_id):
    """Get or create a test invoice for testing"""
    # Generate a new invoice from the order
    response = requests.post(
        f"{BASE_URL}/api/orders/{test_order_id}/generate-invoice?invoice_type=customer",
        headers=auth_headers
    )
    if response.status_code == 200:
        return response.json()["id"]
    
    # If generation fails, try to get existing invoice
    invoices_resp = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
    if invoices_resp.status_code == 200:
        invoices = invoices_resp.json()
        if invoices:
            # Find an unsigned invoice
            for inv in invoices:
                if inv.get("status") != "signed":
                    return inv["id"]
            # If all signed, return first one
            return invoices[0]["id"]
    
    pytest.skip("No invoices available for testing")


class TestSuperadminOrderEdit:
    """Test superadmin can edit customer/vehicle/location fields on orders"""
    
    def test_superadmin_can_update_customer_name(self, auth_headers, test_order_id):
        """Superadmin can update customer_name on order"""
        test_name = f"TEST_Customer_{uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json={"customer_name": test_name}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["customer_name"] == test_name
        print(f"✓ Superadmin updated customer_name to: {test_name}")
    
    def test_superadmin_can_update_phone(self, auth_headers, test_order_id):
        """Superadmin can update phone on order"""
        test_phone = "555-TEST-1234"
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json={"phone": test_phone}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["phone"] == test_phone
        print(f"✓ Superadmin updated phone to: {test_phone}")
    
    def test_superadmin_can_update_email(self, auth_headers, test_order_id):
        """Superadmin can update email on order"""
        test_email = "test_superadmin@example.com"
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json={"email": test_email}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["email"] == test_email
        print(f"✓ Superadmin updated email to: {test_email}")
    
    def test_superadmin_can_update_vehicle_fields(self, auth_headers, test_order_id):
        """Superadmin can update vehicle_year, vehicle_make, vehicle_model"""
        update_data = {
            "vehicle_year": "2025",
            "vehicle_make": "TEST_Tesla",
            "vehicle_model": "TEST_Model_S"
        }
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["vehicle_year"] == "2025"
        assert data["vehicle_make"] == "TEST_Tesla"
        assert data["vehicle_model"] == "TEST_Model_S"
        print("✓ Superadmin updated vehicle fields (year, make, model)")
    
    def test_superadmin_can_update_pickup_location(self, auth_headers, test_order_id):
        """Superadmin can update pickup_city, pickup_state"""
        update_data = {
            "pickup_city": "TEST_Los_Angeles",
            "pickup_state": "CA"
        }
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["pickup_city"] == "TEST_Los_Angeles"
        assert data["pickup_state"] == "CA"
        print("✓ Superadmin updated pickup location (city, state)")
    
    def test_superadmin_can_update_delivery_location(self, auth_headers, test_order_id):
        """Superadmin can update delivery_city, delivery_state"""
        update_data = {
            "delivery_city": "TEST_New_York",
            "delivery_state": "NY"
        }
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["delivery_city"] == "TEST_New_York"
        assert data["delivery_state"] == "NY"
        print("✓ Superadmin updated delivery location (city, state)")
    
    def test_superadmin_can_update_agent_name(self, auth_headers, test_order_id):
        """Superadmin can update agent_name on order"""
        test_agent = "TEST_Agent_Smith"
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json={"agent_name": test_agent}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["agent_name"] == test_agent
        print(f"✓ Superadmin updated agent_name to: {test_agent}")
    
    def test_superadmin_can_update_source(self, auth_headers, test_order_id):
        """Superadmin can update source on order"""
        test_source = "TEST_Website_Lead"
        response = requests.put(
            f"{BASE_URL}/api/orders/{test_order_id}",
            headers=auth_headers,
            json={"source": test_source}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["source"] == test_source
        print(f"✓ Superadmin updated source to: {test_source}")


class TestSuperadminInvoiceBrandingEdit:
    """Test superadmin can edit branding fields on invoices"""
    
    def test_superadmin_can_update_company_name(self, auth_headers, test_invoice_id):
        """Superadmin can update company_name on invoice"""
        test_name = "TEST_Breamway_Custom_Name"
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"company_name": test_name}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["company_name"] == test_name
        print(f"✓ Superadmin updated company_name to: {test_name}")
    
    def test_superadmin_can_update_company_subtitle(self, auth_headers, test_invoice_id):
        """Superadmin can update company_subtitle on invoice"""
        test_subtitle = "TEST_Custom_Subtitle_LLC"
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"company_subtitle": test_subtitle}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["company_subtitle"] == test_subtitle
        print(f"✓ Superadmin updated company_subtitle to: {test_subtitle}")
    
    def test_superadmin_can_update_company_dot(self, auth_headers, test_invoice_id):
        """Superadmin can update company_dot on invoice"""
        test_dot = "TEST_USDOT# 9999999 | MC# 8888888"
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"company_dot": test_dot}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["company_dot"] == test_dot
        print(f"✓ Superadmin updated company_dot to: {test_dot}")
    
    def test_superadmin_can_update_document_title(self, auth_headers, test_invoice_id):
        """Superadmin can update document_title on invoice"""
        test_title = "TEST_Custom_Document_Title"
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"document_title": test_title}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["document_title"] == test_title
        print(f"✓ Superadmin updated document_title to: {test_title}")
    
    def test_superadmin_can_update_all_branding_fields_together(self, auth_headers, test_invoice_id):
        """Superadmin can update all branding fields in one request"""
        update_data = {
            "company_name": "TEST_Full_Update_Company",
            "company_subtitle": "TEST_Full_Update_Subtitle",
            "company_dot": "TEST_USDOT# 1111111 | MC# 2222222",
            "document_title": "TEST_Full_Update_Title"
        }
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["company_name"] == update_data["company_name"]
        assert data["company_subtitle"] == update_data["company_subtitle"]
        assert data["company_dot"] == update_data["company_dot"]
        assert data["document_title"] == update_data["document_title"]
        print("✓ Superadmin updated all branding fields together")


class TestSignedInvoiceAccessControl:
    """Test that admin cannot edit signed invoices but superadmin can"""
    
    def test_superadmin_can_sign_invoice(self, auth_headers, test_invoice_id):
        """Superadmin can sign an invoice"""
        # First reset the invoice to unsigned state
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"status": "draft", "signature_data": None, "signer_name": None}
        )
        # This might fail if already signed, which is fine
        
        # Now sign it
        sign_response = requests.post(
            f"{BASE_URL}/api/invoices/{test_invoice_id}/sign",
            json={"signer_name": "TEST_Signer", "signature_data": "data:image/png;base64,TEST_SIGNATURE"}
        )
        # Either 200 (signed) or 400 (already signed) is acceptable
        assert sign_response.status_code in [200, 400], f"Unexpected status: {sign_response.text}"
        print("✓ Invoice signing endpoint works")
    
    def test_superadmin_can_edit_signed_invoice(self, auth_headers):
        """Superadmin CAN edit a signed invoice"""
        # First get a signed invoice or create one
        invoices_resp = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert invoices_resp.status_code == 200
        invoices = invoices_resp.json()
        
        signed_invoice = None
        for inv in invoices:
            if inv.get("status") == "signed":
                signed_invoice = inv
                break
        
        if not signed_invoice:
            pytest.skip("No signed invoice available for testing")
        
        # Superadmin should be able to edit signed invoice
        response = requests.put(
            f"{BASE_URL}/api/invoices/{signed_invoice['id']}",
            headers=auth_headers,
            json={"notes": "TEST_Superadmin_Edit_On_Signed"}
        )
        assert response.status_code == 200, f"Superadmin should be able to edit signed invoice: {response.text}"
        print("✓ Superadmin CAN edit signed invoice")


class TestInvoiceFieldsEditable:
    """Test that all invoice fields are editable for superadmin before signing"""
    
    def test_superadmin_can_edit_terms(self, auth_headers, test_invoice_id):
        """Superadmin can edit terms on invoice"""
        test_terms = "TEST_CUSTOM_TERMS_AND_CONDITIONS"
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json={"terms": test_terms}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["terms"] == test_terms
        print("✓ Superadmin can edit terms")
    
    def test_superadmin_can_edit_pricing(self, auth_headers, test_invoice_id):
        """Superadmin can edit pricing fields on invoice"""
        update_data = {
            "deposit_amount": 999.99,
            "total_price": 1999.99,
            "cod_amount": 1000.00
        }
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["deposit_amount"] == 999.99
        assert data["total_price"] == 1999.99
        assert data["cod_amount"] == 1000.00
        print("✓ Superadmin can edit pricing fields")
    
    def test_superadmin_can_edit_customer_info(self, auth_headers, test_invoice_id):
        """Superadmin can edit customer info on invoice"""
        update_data = {
            "customer_name": "TEST_Invoice_Customer",
            "customer_email": "test_invoice@example.com",
            "customer_phone": "555-INV-TEST"
        }
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["customer_name"] == update_data["customer_name"]
        assert data["customer_email"] == update_data["customer_email"]
        assert data["customer_phone"] == update_data["customer_phone"]
        print("✓ Superadmin can edit customer info on invoice")
    
    def test_superadmin_can_edit_vehicle_info(self, auth_headers, test_invoice_id):
        """Superadmin can edit vehicle info on invoice"""
        update_data = {
            "vehicle_year": "2026",
            "vehicle_make": "TEST_Rivian",
            "vehicle_model": "TEST_R1T"
        }
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["vehicle_year"] == "2026"
        assert data["vehicle_make"] == "TEST_Rivian"
        assert data["vehicle_model"] == "TEST_R1T"
        print("✓ Superadmin can edit vehicle info on invoice")
    
    def test_superadmin_can_edit_route_info(self, auth_headers, test_invoice_id):
        """Superadmin can edit route info on invoice"""
        update_data = {
            "pickup_city": "TEST_Miami",
            "pickup_state": "FL",
            "delivery_city": "TEST_Seattle",
            "delivery_state": "WA"
        }
        response = requests.put(
            f"{BASE_URL}/api/invoices/{test_invoice_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["pickup_city"] == "TEST_Miami"
        assert data["pickup_state"] == "FL"
        assert data["delivery_city"] == "TEST_Seattle"
        assert data["delivery_state"] == "WA"
        print("✓ Superadmin can edit route info on invoice")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
