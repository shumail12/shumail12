"""
Test Revenue Features for Auto Transport CRM
- Revenue form submission
- Revenue listing (user-filtered)
- Revenue by order
- Revenue admin summary
- Dashboard stats with revenue fields
- User-specific leads filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRevenueFeatures:
    """Test revenue tracking system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json().get("user")
        yield
    
    def test_dashboard_stats_has_revenue_fields(self):
        """Dashboard stats should return my_revenue, revenue_target, total_revenue"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check required revenue fields exist
        assert "my_revenue" in data, "my_revenue field missing from dashboard stats"
        assert "revenue_target" in data, "revenue_target field missing from dashboard stats"
        assert "total_revenue" in data, "total_revenue field missing from dashboard stats"
        
        # Verify types
        assert isinstance(data["my_revenue"], (int, float)), "my_revenue should be numeric"
        assert isinstance(data["revenue_target"], (int, float)), "revenue_target should be numeric"
        assert isinstance(data["total_revenue"], (int, float)), "total_revenue should be numeric"
        
        # Revenue target should be one of the levels: 1500, 3000, or 5000
        assert data["revenue_target"] in [1500, 3000, 5000], f"Invalid revenue_target: {data['revenue_target']}"
        print(f"Dashboard stats: my_revenue={data['my_revenue']}, revenue_target={data['revenue_target']}, total_revenue={data['total_revenue']}")
    
    def test_get_orders_for_revenue_test(self):
        """Get an order to use for revenue form testing"""
        response = self.session.get(f"{BASE_URL}/api/orders", params={"limit": 5})
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        
        if data["total"] > 0:
            order = data["orders"][0]
            self.test_order_id = order["id"]
            self.test_order_number = order.get("order_number", "")
            print(f"Found order for testing: {self.test_order_number} (ID: {self.test_order_id})")
        else:
            pytest.skip("No orders available for revenue testing")
    
    def test_submit_revenue_form(self):
        """POST /api/revenue - Submit revenue form for an order"""
        # First get an order
        orders_response = self.session.get(f"{BASE_URL}/api/orders", params={"limit": 5})
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        
        if orders_data["total"] == 0:
            pytest.skip("No orders available for revenue testing")
        
        order = orders_data["orders"][0]
        order_id = order["id"]
        
        # Check if revenue already exists for this order
        existing_rev = self.session.get(f"{BASE_URL}/api/revenue/by-order/{order_id}")
        if existing_rev.status_code == 200 and existing_rev.json():
            print(f"Revenue already exists for order {order['order_number']}, skipping submission test")
            return
        
        # Submit revenue form
        revenue_data = {
            "order_id": order_id,
            "customer_name": order.get("customer_name", "Test Customer"),
            "vehicle_info": f"{order.get('vehicle_year', '')} {order.get('vehicle_make', '')} {order.get('vehicle_model', '')}".strip(),
            "route": f"{order.get('pickup_city', '')}, {order.get('pickup_state', '')} → {order.get('delivery_city', '')}, {order.get('delivery_state', '')}",
            "deposit_amount": 250.00,
            "total_price": 500.00,
            "payment_method": "Zelle",
            "notes": "Test revenue submission"
        }
        
        response = self.session.post(f"{BASE_URL}/api/revenue", json=revenue_data)
        assert response.status_code == 200, f"Submit revenue failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Revenue form should have an ID"
        assert data["order_id"] == order_id, "Order ID should match"
        assert data["deposit_amount"] == 250.00, "Deposit amount should match"
        assert data["payment_method"] == "Zelle", "Payment method should match"
        assert "submitted_by" in data, "Should have submitted_by field"
        assert "submitted_by_id" in data, "Should have submitted_by_id field"
        print(f"Revenue form submitted successfully: ID={data['id']}, deposit=${data['deposit_amount']}")
    
    def test_get_revenue_forms(self):
        """GET /api/revenue - List revenue forms"""
        response = self.session.get(f"{BASE_URL}/api/revenue", params={"limit": 100})
        assert response.status_code == 200, f"Get revenue forms failed: {response.text}"
        
        data = response.json()
        assert "forms" in data, "Response should have 'forms' field"
        assert "total" in data, "Response should have 'total' field"
        assert isinstance(data["forms"], list), "forms should be a list"
        
        print(f"Revenue forms: total={data['total']}, returned={len(data['forms'])}")
        
        if len(data["forms"]) > 0:
            form = data["forms"][0]
            # Verify form structure
            expected_fields = ["id", "order_id", "customer_name", "deposit_amount", "payment_method", "submitted_by"]
            for field in expected_fields:
                assert field in form, f"Revenue form missing field: {field}"
    
    def test_get_revenue_by_order(self):
        """GET /api/revenue/by-order/{order_id} - Get revenue for specific order"""
        # First get an order
        orders_response = self.session.get(f"{BASE_URL}/api/orders", params={"limit": 5})
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        
        if orders_data["total"] == 0:
            pytest.skip("No orders available")
        
        order = orders_data["orders"][0]
        order_id = order["id"]
        
        response = self.session.get(f"{BASE_URL}/api/revenue/by-order/{order_id}")
        assert response.status_code == 200, f"Get revenue by order failed: {response.text}"
        
        # Response can be null if no revenue exists, or the revenue form
        data = response.json()
        if data:
            assert data["order_id"] == order_id, "Order ID should match"
            print(f"Revenue for order {order['order_number']}: deposit=${data.get('deposit_amount', 0)}, method={data.get('payment_method', 'N/A')}")
        else:
            print(f"No revenue form exists for order {order['order_number']}")
    
    def test_revenue_admin_summary(self):
        """GET /api/revenue/admin/summary - Super admin revenue breakdown"""
        response = self.session.get(f"{BASE_URL}/api/revenue/admin/summary")
        assert response.status_code == 200, f"Get admin summary failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "total_deposits" in data, "Should have total_deposits"
        assert "total_forms" in data, "Should have total_forms"
        assert "by_user" in data, "Should have by_user breakdown"
        assert "by_payment_method" in data, "Should have by_payment_method breakdown"
        
        assert isinstance(data["by_user"], list), "by_user should be a list"
        assert isinstance(data["by_payment_method"], list), "by_payment_method should be a list"
        
        print(f"Admin summary: total_deposits=${data['total_deposits']}, total_forms={data['total_forms']}")
        print(f"  By user: {len(data['by_user'])} agents")
        print(f"  By payment method: {len(data['by_payment_method'])} methods")
        
        # Verify by_user structure if data exists
        if len(data["by_user"]) > 0:
            user_entry = data["by_user"][0]
            assert "name" in user_entry, "by_user entry should have name"
            assert "total_deposit" in user_entry, "by_user entry should have total_deposit"
            assert "count" in user_entry, "by_user entry should have count"
        
        # Verify by_payment_method structure if data exists
        if len(data["by_payment_method"]) > 0:
            method_entry = data["by_payment_method"][0]
            assert "method" in method_entry, "by_payment_method entry should have method"
            assert "total" in method_entry, "by_payment_method entry should have total"
            assert "count" in method_entry, "by_payment_method entry should have count"
    
    def test_revenue_form_invalid_order(self):
        """POST /api/revenue with invalid order_id should return 404"""
        revenue_data = {
            "order_id": "non-existent-order-id",
            "deposit_amount": 100.00,
            "payment_method": "COD"
        }
        
        response = self.session.post(f"{BASE_URL}/api/revenue", json=revenue_data)
        assert response.status_code == 404, f"Expected 404 for invalid order, got {response.status_code}"
        print("Correctly returned 404 for non-existent order")


class TestUserSpecificLeads:
    """Test user-specific leads filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user = login_response.json().get("user")
        yield
    
    def test_get_leads_as_superadmin(self):
        """Superadmin should see all leads"""
        response = self.session.get(f"{BASE_URL}/api/leads", params={"limit": 10})
        assert response.status_code == 200, f"Get leads failed: {response.text}"
        
        data = response.json()
        assert "leads" in data, "Response should have 'leads' field"
        assert "total" in data, "Response should have 'total' field"
        
        print(f"Superadmin sees {data['total']} total leads, returned {len(data['leads'])}")


class TestQuotesTableCleanup:
    """Test that quotes table has cleaned up columns"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_quotes_returns_expected_fields(self):
        """GET /api/quotes should return quotes with expected fields"""
        response = self.session.get(f"{BASE_URL}/api/quotes", params={"limit": 5})
        assert response.status_code == 200, f"Get quotes failed: {response.text}"
        
        data = response.json()
        assert "quotes" in data, "Response should have 'quotes' field"
        
        if len(data["quotes"]) > 0:
            quote = data["quotes"][0]
            # These fields should exist for the table
            expected_fields = ["id", "quote_number", "agent_name", "customer_name", "phone", "email", "price"]
            for field in expected_fields:
                assert field in quote, f"Quote missing expected field: {field}"
            print(f"Quote has all expected fields: {expected_fields}")


class TestOrderPaymentMethod:
    """Test order payment method functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_update_order_payment_method(self):
        """PUT /api/orders/{id} should accept payment_method"""
        # Get an order
        orders_response = self.session.get(f"{BASE_URL}/api/orders", params={"limit": 1})
        assert orders_response.status_code == 200
        orders_data = orders_response.json()
        
        if orders_data["total"] == 0:
            pytest.skip("No orders available")
        
        order = orders_data["orders"][0]
        order_id = order["id"]
        
        # Update payment method
        update_data = {"payment_method": "CashApp"}
        response = self.session.put(f"{BASE_URL}/api/orders/{order_id}", json=update_data)
        assert response.status_code == 200, f"Update order failed: {response.text}"
        
        updated_order = response.json()
        assert updated_order.get("payment_method") == "CashApp", "Payment method should be updated"
        print(f"Order {order['order_number']} payment method updated to CashApp")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
