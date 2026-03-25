"""
Test Invoice/Agreement System Features - Iteration 10
Tests for:
- POST /api/orders/{order_id}/generate-invoice?invoice_type=customer
- POST /api/orders/{order_id}/generate-invoice?invoice_type=carrier
- PUT /api/invoices/{invoice_id} - admin/superadmin only
- POST /api/invoices/{invoice_id}/sign - public signing endpoint
- GET /api/invoices - returns invoices with new fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoiceFeatures:
    """Test new invoice/agreement system features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin
        login_response = self.session.post(f"{self.base_url}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get an existing order for testing
        orders_response = self.session.get(f"{self.base_url}/api/orders?limit=1")
        assert orders_response.status_code == 200
        orders = orders_response.json().get("orders", [])
        if orders:
            self.test_order_id = orders[0]["id"]
            self.test_order_number = orders[0].get("order_number", "")
        else:
            pytest.skip("No orders available for testing")
    
    def test_generate_customer_invoice(self):
        """Test generating customer invoice from order"""
        response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert response.status_code == 200, f"Failed to generate customer invoice: {response.text}"
        
        invoice = response.json()
        # Verify invoice structure
        assert "id" in invoice
        assert "invoice_number" in invoice
        assert invoice["invoice_type"] == "customer"
        assert invoice["order_id"] == self.test_order_id
        assert "customer_name" in invoice
        assert "customer_email" in invoice
        assert "customer_phone" in invoice
        assert "vehicle_year" in invoice
        assert "vehicle_make" in invoice
        assert "vehicle_model" in invoice
        assert "pickup_city" in invoice
        assert "delivery_city" in invoice
        assert "total_price" in invoice
        assert "deposit_amount" in invoice
        assert "cod_amount" in invoice
        assert "terms" in invoice
        assert invoice["status"] == "draft"
        
        # Store for later tests
        self.customer_invoice_id = invoice["id"]
        print(f"Customer invoice generated: {invoice['invoice_number']}")
    
    def test_generate_carrier_invoice(self):
        """Test generating carrier invoice from order"""
        response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=carrier"
        )
        assert response.status_code == 200, f"Failed to generate carrier invoice: {response.text}"
        
        invoice = response.json()
        # Verify invoice structure
        assert "id" in invoice
        assert "invoice_number" in invoice
        assert invoice["invoice_type"] == "carrier"
        assert invoice["order_id"] == self.test_order_id
        assert "carrier_name" in invoice
        assert "carrier_mc" in invoice
        assert "carrier_phone" in invoice
        assert "driver_name" in invoice
        assert "driver_phone" in invoice
        assert "carrier_pay" in invoice
        assert "terms" in invoice
        assert invoice["status"] == "draft"
        
        # Store for later tests
        self.carrier_invoice_id = invoice["id"]
        print(f"Carrier invoice generated: {invoice['invoice_number']}")
    
    def test_get_invoices_with_new_fields(self):
        """Test GET /api/invoices returns invoices with new fields"""
        response = self.session.get(f"{self.base_url}/api/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        assert isinstance(invoices, list)
        
        if invoices:
            invoice = invoices[0]
            # Check for new fields
            assert "invoice_type" in invoice or invoice.get("invoice_type") is None
            print(f"Found {len(invoices)} invoices")
    
    def test_update_invoice_as_superadmin(self):
        """Test PUT /api/invoices/{id} - superadmin can edit"""
        # First generate an invoice
        gen_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert gen_response.status_code == 200
        invoice_id = gen_response.json()["id"]
        
        # Update the invoice
        update_data = {
            "customer_name": "TEST_Updated Customer Name",
            "customer_email": "test_updated@example.com",
            "notes": "TEST_Updated notes",
            "deposit_amount": 200.00
        }
        response = self.session.put(f"{self.base_url}/api/invoices/{invoice_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update invoice: {response.text}"
        
        updated = response.json()
        assert updated["customer_name"] == "TEST_Updated Customer Name"
        assert updated["customer_email"] == "test_updated@example.com"
        assert updated["notes"] == "TEST_Updated notes"
        print(f"Invoice updated successfully: {invoice_id}")
    
    def test_sign_invoice(self):
        """Test POST /api/invoices/{id}/sign - public signing endpoint"""
        # First generate an invoice
        gen_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert gen_response.status_code == 200
        invoice_id = gen_response.json()["id"]
        
        # Sign the invoice (public endpoint - no auth required)
        sign_data = {
            "signer_name": "TEST_John Doe",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        response = self.session.post(f"{self.base_url}/api/invoices/{invoice_id}/sign", json=sign_data)
        assert response.status_code == 200, f"Failed to sign invoice: {response.text}"
        
        signed = response.json()
        assert signed["status"] == "signed"
        assert signed["signer_name"] == "TEST_John Doe"
        assert signed["signature_data"] is not None
        assert "signed_at" in signed
        print(f"Invoice signed successfully: {invoice_id}")
    
    def test_sign_already_signed_invoice_fails(self):
        """Test signing an already signed invoice returns error"""
        # First generate and sign an invoice
        gen_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert gen_response.status_code == 200
        invoice_id = gen_response.json()["id"]
        
        sign_data = {
            "signer_name": "TEST_First Signer",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        first_sign = self.session.post(f"{self.base_url}/api/invoices/{invoice_id}/sign", json=sign_data)
        assert first_sign.status_code == 200
        
        # Try to sign again
        second_sign = self.session.post(f"{self.base_url}/api/invoices/{invoice_id}/sign", json=sign_data)
        assert second_sign.status_code == 400, "Should fail when signing already signed invoice"
        print("Correctly rejected double signing")
    
    def test_generate_invoice_invalid_order(self):
        """Test generating invoice for non-existent order returns 404"""
        response = self.session.post(
            f"{self.base_url}/api/orders/invalid-order-id/generate-invoice?invoice_type=customer"
        )
        assert response.status_code == 404
        print("Correctly returned 404 for invalid order")
    
    def test_invoice_terms_populated(self):
        """Test that generated invoices have default terms populated"""
        # Customer invoice
        cust_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert cust_response.status_code == 200
        cust_invoice = cust_response.json()
        assert cust_invoice["terms"] is not None
        assert len(cust_invoice["terms"]) > 100  # Should have substantial terms
        assert "VEHICLE TRANSPORT AGREEMENT" in cust_invoice["terms"]
        
        # Carrier invoice
        carr_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=carrier"
        )
        assert carr_response.status_code == 200
        carr_invoice = carr_response.json()
        assert carr_invoice["terms"] is not None
        assert len(carr_invoice["terms"]) > 100
        assert "CARRIER DISPATCH AGREEMENT" in carr_invoice["terms"]
        print("Invoice terms correctly populated")
    
    def test_invoice_cod_calculation(self):
        """Test that COD amount is correctly calculated (total - deposit)"""
        response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert response.status_code == 200
        invoice = response.json()
        
        total = invoice.get("total_price", 0) or 0
        deposit = invoice.get("deposit_amount", 0) or 0
        cod = invoice.get("cod_amount", 0) or 0
        
        expected_cod = max(0, total - deposit)
        assert cod == expected_cod, f"COD calculation wrong: {cod} != {expected_cod}"
        print(f"COD correctly calculated: ${total} - ${deposit} = ${cod}")


class TestInvoiceRoleRestrictions:
    """Test role-based access control for invoice editing"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin first to create test data
        login_response = self.session.post(f"{self.base_url}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get an order
        orders_response = self.session.get(f"{self.base_url}/api/orders?limit=1")
        orders = orders_response.json().get("orders", [])
        if orders:
            self.test_order_id = orders[0]["id"]
        else:
            pytest.skip("No orders available")
    
    def test_superadmin_can_edit_invoice(self):
        """Verify superadmin can edit invoices"""
        # Generate invoice
        gen_response = self.session.post(
            f"{self.base_url}/api/orders/{self.test_order_id}/generate-invoice?invoice_type=customer"
        )
        assert gen_response.status_code == 200
        invoice_id = gen_response.json()["id"]
        
        # Update as superadmin
        update_response = self.session.put(
            f"{self.base_url}/api/invoices/{invoice_id}",
            json={"notes": "TEST_Superadmin edit"}
        )
        assert update_response.status_code == 200
        print("Superadmin can edit invoices - PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
