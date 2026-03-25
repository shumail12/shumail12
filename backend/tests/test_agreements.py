"""
Test suite for Agreement/Contract System - Breamway Auto Transport CRM
Tests all agreement CRUD operations, signing flow, and public endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERNAME = "shumail.s"
TEST_PASSWORD = "HONDA@2026"


class TestAgreementSystem:
    """Agreement/Contract System Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.test_order_id = None
        self.test_agreement_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def get_or_create_test_order(self):
        """Get an existing order or create one for testing"""
        self.get_auth_token()
        
        # First try to get existing orders
        response = self.session.get(f"{BASE_URL}/api/orders", params={"limit": 1})
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            if orders:
                self.test_order_id = orders[0]["id"]
                return self.test_order_id
        
        # If no orders, create a quote and convert to order
        quote_response = self.session.post(f"{BASE_URL}/api/quotes", json={
            "customer_name": "TEST_Agreement_Customer",
            "phone": "555-123-4567",
            "email": "test.agreement@example.com",
            "vehicle_year": "2023",
            "vehicle_make": "Honda",
            "vehicle_model": "Accord",
            "pickup_address": "Los Angeles, CA",
            "pickup_city": "Los Angeles",
            "pickup_state": "CA",
            "delivery_address": "Houston, TX",
            "delivery_city": "Houston",
            "delivery_state": "TX",
            "price": 1500,
            "deposit_fee": 200,
            "status": "quoted"
        })
        assert quote_response.status_code == 200, f"Quote creation failed: {quote_response.text}"
        quote_id = quote_response.json()["id"]
        
        # Convert to order
        order_response = self.session.post(f"{BASE_URL}/api/quotes/{quote_id}/convert-to-order")
        assert order_response.status_code == 200, f"Order conversion failed: {order_response.text}"
        self.test_order_id = order_response.json()["id"]
        return self.test_order_id
    
    # ==================== AGREEMENT CRUD TESTS ====================
    
    def test_01_create_agreement_from_order(self):
        """POST /api/agreements - Create agreement from order with auto-fill"""
        order_id = self.get_or_create_test_order()
        
        response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        
        assert response.status_code == 200, f"Create agreement failed: {response.text}"
        data = response.json()
        
        # Verify auto-generated fields
        assert "id" in data
        assert "agreement_number" in data
        assert data["agreement_number"].startswith("AGR-")
        assert data["status"] == "draft"
        
        # Verify auto-fill from order
        assert data["customer_name"] != ""
        assert data["order_id"] == order_id
        assert "terms" in data and len(data["terms"]) > 100  # Default terms populated
        
        self.test_agreement_id = data["id"]
        print(f"Created agreement: {data['agreement_number']}")
        
    def test_02_get_agreements_list(self):
        """GET /api/agreements - List agreements with pagination"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/agreements", params={"limit": 50})
        
        assert response.status_code == 200, f"Get agreements failed: {response.text}"
        data = response.json()
        
        assert "agreements" in data
        assert "total" in data
        assert isinstance(data["agreements"], list)
        print(f"Found {data['total']} agreements")
        
    def test_03_get_agreements_with_search(self):
        """GET /api/agreements - Search agreements"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/agreements", params={"search": "AGR"})
        
        assert response.status_code == 200, f"Search agreements failed: {response.text}"
        data = response.json()
        assert "agreements" in data
        
    def test_04_get_agreements_with_status_filter(self):
        """GET /api/agreements - Filter by status"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/agreements", params={"status": "draft"})
        
        assert response.status_code == 200, f"Filter agreements failed: {response.text}"
        data = response.json()
        
        # All returned agreements should be draft
        for agr in data["agreements"]:
            assert agr["status"] == "draft"
            
    def test_05_get_single_agreement(self):
        """GET /api/agreements/{id} - Get single agreement"""
        # First create an agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Get the agreement
        response = self.session.get(f"{BASE_URL}/api/agreements/{agreement_id}")
        
        assert response.status_code == 200, f"Get agreement failed: {response.text}"
        data = response.json()
        
        assert data["id"] == agreement_id
        assert "agreement_number" in data
        assert "customer_name" in data
        assert "terms" in data
        
    def test_06_update_draft_agreement(self):
        """PUT /api/agreements/{id} - Update draft agreement"""
        # Create agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Update agreement
        response = self.session.put(f"{BASE_URL}/api/agreements/{agreement_id}", json={
            "special_conditions": "TEST_Updated special conditions",
            "price": 2000
        })
        
        assert response.status_code == 200, f"Update agreement failed: {response.text}"
        data = response.json()
        
        assert data["special_conditions"] == "TEST_Updated special conditions"
        assert data["price"] == 2000
        
    def test_07_agreement_not_found(self):
        """GET /api/agreements/{id} - 404 for non-existent agreement"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/agreements/non-existent-id-12345")
        
        assert response.status_code == 404
        
    # ==================== AGREEMENT STATUS FLOW TESTS ====================
    
    def test_08_send_agreement(self):
        """POST /api/agreements/{id}/send - Mark agreement as sent"""
        # Create agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Send agreement
        response = self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        
        assert response.status_code == 200, f"Send agreement failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "sent"
        print(f"Agreement {data['agreement_number']} marked as sent")
        
    def test_09_sign_agreement_authenticated(self):
        """POST /api/agreements/{id}/sign - Sign agreement (authenticated)"""
        # Create and send agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Send first
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        
        # Sign agreement
        response = self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/sign", json={
            "signer_name": "TEST_John Doe",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        
        assert response.status_code == 200, f"Sign agreement failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "signed"
        assert data["signer_name"] == "TEST_John Doe"
        assert data["signature_data"] is not None
        assert data["signed_at"] is not None
        print(f"Agreement {data['agreement_number']} signed by {data['signer_name']}")
        
    def test_10_void_agreement(self):
        """POST /api/agreements/{id}/void - Void agreement"""
        # Create agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Void agreement
        response = self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/void")
        
        assert response.status_code == 200, f"Void agreement failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "void"
        print(f"Agreement {data['agreement_number']} voided")
        
    def test_11_delete_draft_agreement(self):
        """DELETE /api/agreements/{id} - Delete non-signed agreement"""
        # Create agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        agreement_number = create_response.json()["agreement_number"]
        
        # Delete agreement
        response = self.session.delete(f"{BASE_URL}/api/agreements/{agreement_id}")
        
        assert response.status_code == 200, f"Delete agreement failed: {response.text}"
        
        # Verify deleted
        get_response = self.session.get(f"{BASE_URL}/api/agreements/{agreement_id}")
        assert get_response.status_code == 404
        print(f"Agreement {agreement_number} deleted successfully")
        
    def test_12_cannot_delete_signed_agreement(self):
        """DELETE /api/agreements/{id} - Cannot delete signed agreement"""
        # Create, send, and sign agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/sign", json={
            "signer_name": "TEST_Jane Doe",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        
        # Try to delete signed agreement
        response = self.session.delete(f"{BASE_URL}/api/agreements/{agreement_id}")
        
        assert response.status_code == 400, f"Should not be able to delete signed agreement"
        assert "signed" in response.json().get("detail", "").lower()
        
    def test_13_cannot_edit_signed_agreement(self):
        """PUT /api/agreements/{id} - Cannot edit signed agreement"""
        # Create, send, and sign agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/sign", json={
            "signer_name": "TEST_Bob Smith",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        
        # Try to edit signed agreement
        response = self.session.put(f"{BASE_URL}/api/agreements/{agreement_id}", json={
            "price": 9999
        })
        
        assert response.status_code == 400, f"Should not be able to edit signed agreement"
        
    # ==================== PUBLIC ENDPOINT TESTS ====================
    
    def test_14_get_public_agreement(self):
        """GET /api/agreements/public/{id} - Get agreement without auth"""
        # Create agreement with auth
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        # Get public agreement WITHOUT auth
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        response = public_session.get(f"{BASE_URL}/api/agreements/public/{agreement_id}")
        
        assert response.status_code == 200, f"Get public agreement failed: {response.text}"
        data = response.json()
        
        assert data["id"] == agreement_id
        assert "agreement_number" in data
        assert "customer_name" in data
        assert "terms" in data
        # Signature data should be excluded from public endpoint
        assert "signature_data" not in data or data.get("signature_data") is None
        print(f"Public agreement {data['agreement_number']} retrieved successfully")
        
    def test_15_public_sign_agreement(self):
        """POST /api/agreements/public/{id}/sign - Sign agreement without auth"""
        # Create and send agreement with auth
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        
        # Sign via public endpoint WITHOUT auth
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        response = public_session.post(f"{BASE_URL}/api/agreements/public/{agreement_id}/sign", json={
            "signer_name": "TEST_Public Signer",
            "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        })
        
        assert response.status_code == 200, f"Public sign failed: {response.text}"
        
        # Verify signed via authenticated endpoint
        verify_response = self.session.get(f"{BASE_URL}/api/agreements/{agreement_id}")
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        assert data["status"] == "signed"
        assert data["signer_name"] == "TEST_Public Signer"
        print(f"Agreement signed via public endpoint by {data['signer_name']}")
        
    def test_16_public_cannot_sign_voided_agreement(self):
        """POST /api/agreements/public/{id}/sign - Cannot sign voided agreement"""
        # Create and void agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/void")
        
        # Try to sign voided agreement via public endpoint
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        response = public_session.post(f"{BASE_URL}/api/agreements/public/{agreement_id}/sign", json={
            "signer_name": "TEST_Should Fail",
            "signature_data": "data:image/png;base64,test"
        })
        
        assert response.status_code == 400, f"Should not be able to sign voided agreement"
        
    def test_17_public_cannot_sign_already_signed(self):
        """POST /api/agreements/public/{id}/sign - Cannot sign already signed agreement"""
        # Create, send, and sign agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/send")
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/sign", json={
            "signer_name": "TEST_First Signer",
            "signature_data": "data:image/png;base64,test"
        })
        
        # Try to sign again via public endpoint
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        response = public_session.post(f"{BASE_URL}/api/agreements/public/{agreement_id}/sign", json={
            "signer_name": "TEST_Second Signer",
            "signature_data": "data:image/png;base64,test"
        })
        
        assert response.status_code == 400, f"Should not be able to sign already signed agreement"
        
    def test_18_public_voided_agreement_returns_error(self):
        """GET /api/agreements/public/{id} - Voided agreement returns error"""
        # Create and void agreement
        order_id = self.get_or_create_test_order()
        create_response = self.session.post(f"{BASE_URL}/api/agreements", json={
            "order_id": order_id,
            "agreement_type": "transport"
        })
        assert create_response.status_code == 200
        agreement_id = create_response.json()["id"]
        
        self.session.post(f"{BASE_URL}/api/agreements/{agreement_id}/void")
        
        # Try to get voided agreement via public endpoint
        public_session = requests.Session()
        
        response = public_session.get(f"{BASE_URL}/api/agreements/public/{agreement_id}")
        
        assert response.status_code == 400, f"Should return error for voided agreement"
        
    # ==================== AUTH TESTS ====================
    
    def test_19_agreements_require_auth(self):
        """Agreements endpoints require authentication"""
        public_session = requests.Session()
        public_session.headers.update({"Content-Type": "application/json"})
        
        # GET /api/agreements
        response = public_session.get(f"{BASE_URL}/api/agreements")
        assert response.status_code in [401, 403], "GET /api/agreements should require auth"
        
        # POST /api/agreements
        response = public_session.post(f"{BASE_URL}/api/agreements", json={"order_id": "test"})
        assert response.status_code in [401, 403], "POST /api/agreements should require auth"
        
        print("Auth requirements verified for agreement endpoints")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_agreements(self):
        """Clean up TEST_ prefixed agreements"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "username": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login for cleanup")
            
        token = response.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get all agreements
        response = session.get(f"{BASE_URL}/api/agreements", params={"limit": 200})
        if response.status_code != 200:
            return
            
        agreements = response.json().get("agreements", [])
        deleted = 0
        
        for agr in agreements:
            # Delete test agreements (those with TEST_ in signer_name or special_conditions)
            signer = agr.get("signer_name") or ""
            conditions = agr.get("special_conditions") or ""
            customer = agr.get("customer_name") or ""
            if (signer.startswith("TEST_") or 
                conditions.startswith("TEST_") or
                customer.startswith("TEST_")):
                if agr.get("status") != "signed":
                    del_response = session.delete(f"{BASE_URL}/api/agreements/{agr['id']}")
                    if del_response.status_code == 200:
                        deleted += 1
                        
        print(f"Cleaned up {deleted} test agreements")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
