"""
Backend API Tests for Breamway Auto Transport CRM
Tests: Login, Dashboard, Quotes (CRUD, search, filter, convert-to-order), Orders (CRUD, status update)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
USERNAME = "shumail.s"
PASSWORD = "HONDA@2026"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": USERNAME,
            "password": PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == USERNAME
        print(f"✓ Login successful for {USERNAME}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": USERNAME,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": USERNAME,
        "password": PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboard:
    """Dashboard stats tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint returns correct data"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields exist
        assert "total_quotes" in data
        assert "total_orders" in data
        assert "total_revenue" in data
        assert "conversion_rate" in data
        assert "recent_quotes" in data
        assert "recent_orders" in data
        assert "total_leads" in data
        assert "pending_quotes" in data
        assert "active_orders" in data
        assert "delivered_orders" in data
        
        # Verify total_quotes is ~39,792 as expected
        assert data["total_quotes"] >= 39000, f"Expected ~39,792 quotes, got {data['total_quotes']}"
        
        print(f"✓ Dashboard stats: {data['total_quotes']} total quotes, {data['total_orders']} orders, {data['conversion_rate']}% conversion")
        return data


class TestQuotes:
    """Quotes CRUD and functionality tests"""
    
    def test_get_quotes_paginated(self, auth_headers):
        """Test quotes list with pagination"""
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
            "skip": 0, "limit": 100
        })
        assert response.status_code == 200, f"Get quotes failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "quotes" in data
        assert "total" in data
        assert isinstance(data["quotes"], list)
        
        # Verify pagination
        assert len(data["quotes"]) <= 100
        assert data["total"] >= 39000, f"Expected ~39,792 total, got {data['total']}"
        
        # Verify quote structure (BR format IDs)
        if data["quotes"]:
            quote = data["quotes"][0]
            assert "id" in quote
            assert "quote_number" in quote
            assert quote["quote_number"].startswith("BR"), f"Quote number should start with BR, got {quote['quote_number']}"
            assert "customer_name" in quote
            assert "phone" in quote
            assert "email" in quote
            assert "status" in quote
            
        print(f"✓ Quotes pagination: {len(data['quotes'])} of {data['total']} quotes")
        return data
    
    def test_search_quotes_by_customer_name(self, auth_headers):
        """Test search quotes by customer name"""
        # First get a quote to know a customer name
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={"limit": 1})
        assert response.status_code == 200
        quotes = response.json()["quotes"]
        if not quotes:
            pytest.skip("No quotes to search")
        
        customer_name = quotes[0]["customer_name"]
        if not customer_name:
            pytest.skip("No customer name to search")
        
        # Search by partial name
        search_term = customer_name[:5] if len(customer_name) > 5 else customer_name
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
            "search": search_term
        })
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0, f"Search for '{search_term}' returned no results"
        print(f"✓ Search by customer name '{search_term}': {data['total']} results")
    
    def test_search_quotes_by_phone(self, auth_headers):
        """Test search quotes by phone number"""
        # First get a quote with phone
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={"limit": 50})
        assert response.status_code == 200
        quotes = response.json()["quotes"]
        
        # Find a quote with phone
        quote_with_phone = next((q for q in quotes if q.get("phone")), None)
        if not quote_with_phone:
            pytest.skip("No quotes with phone numbers")
        
        phone = quote_with_phone["phone"]
        # Search by partial phone
        search_term = phone[:6] if len(phone) > 6 else phone
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
            "search": search_term
        })
        assert response.status_code == 200
        data = response.json()
        assert data["total"] > 0, f"Search for phone '{search_term}' returned no results"
        print(f"✓ Search by phone '{search_term}': {data['total']} results")
    
    def test_filter_quotes_by_status(self, auth_headers):
        """Test filter quotes by status"""
        for status in ["lead", "quoted", "order"]:
            response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
                "status": status, "limit": 10
            })
            assert response.status_code == 200, f"Filter by status {status} failed"
            data = response.json()
            # Verify all returned quotes have the correct status
            for quote in data["quotes"]:
                assert quote["status"] == status, f"Expected status {status}, got {quote['status']}"
            print(f"✓ Filter by status '{status}': {data['total']} quotes")
    
    def test_filter_quotes_by_agent(self, auth_headers):
        """Test filter quotes by agent"""
        # First get list of agents
        response = requests.get(f"{BASE_URL}/api/quotes/agents/list", headers=auth_headers)
        assert response.status_code == 200
        agents = response.json()
        
        if not agents:
            pytest.skip("No agents found")
        
        agent = agents[0]
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
            "assigned_to": agent, "limit": 10
        })
        assert response.status_code == 200
        data = response.json()
        # Verify all returned quotes have the correct agent
        for quote in data["quotes"]:
            assert quote["agent_name"] == agent, f"Expected agent {agent}, got {quote['agent_name']}"
        print(f"✓ Filter by agent '{agent}': {data['total']} quotes")
    
    def test_get_single_quote(self, auth_headers):
        """Test get single quote by ID"""
        # First get a quote ID
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={"limit": 1})
        assert response.status_code == 200
        quotes = response.json()["quotes"]
        if not quotes:
            pytest.skip("No quotes available")
        
        quote_id = quotes[0]["id"]
        response = requests.get(f"{BASE_URL}/api/quotes/{quote_id}", headers=auth_headers)
        assert response.status_code == 200
        quote = response.json()
        
        # Verify quote structure
        assert quote["id"] == quote_id
        assert "quote_number" in quote
        assert "customer_name" in quote
        assert "shipping_type" in quote
        assert "price" in quote
        print(f"✓ Get single quote {quote['quote_number']}")
    
    def test_create_quote(self, auth_headers):
        """Test create new quote"""
        new_quote = {
            "customer_name": "TEST_John Doe",
            "phone": "555-123-4567",
            "email": "test@example.com",
            "vehicle_year": "2024",
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "pickup_city": "Los Angeles",
            "pickup_state": "CA",
            "delivery_city": "New York",
            "delivery_state": "NY",
            "shipping_type": "standard",
            "price": 1500,
            "status": "lead"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        assert response.status_code == 200, f"Create quote failed: {response.text}"
        quote = response.json()
        
        # Verify created quote
        assert quote["customer_name"] == new_quote["customer_name"]
        assert quote["quote_number"].startswith("BR")
        assert "id" in quote
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/quotes/{quote['id']}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["customer_name"] == new_quote["customer_name"]
        
        print(f"✓ Created quote {quote['quote_number']}")
        return quote
    
    def test_update_quote(self, auth_headers):
        """Test update quote"""
        # Create a quote first
        new_quote = {
            "customer_name": "TEST_Update Test",
            "phone": "555-999-8888",
            "shipping_type": "standard",
            "price": 1000,
            "status": "lead"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        assert create_response.status_code == 200
        quote = create_response.json()
        
        # Update the quote
        update_data = {
            "price": 1800,
            "status": "quoted",
            "shipping_type": "expedited"
        }
        update_response = requests.put(f"{BASE_URL}/api/quotes/{quote['id']}", headers=auth_headers, json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["price"] == 1800
        assert updated["status"] == "quoted"
        assert updated["shipping_type"] == "expedited"
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/quotes/{quote['id']}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["price"] == 1800
        
        print(f"✓ Updated quote {quote['quote_number']}")
        return quote


class TestConvertToOrder:
    """Test quote to order conversion"""
    
    def test_convert_quote_to_order(self, auth_headers):
        """Test converting a quote to an order"""
        # Create a quote first
        new_quote = {
            "customer_name": "TEST_Convert Test",
            "phone": "555-777-6666",
            "email": "convert@test.com",
            "vehicle_year": "2023",
            "vehicle_make": "Honda",
            "vehicle_model": "Accord",
            "pickup_city": "Miami",
            "pickup_state": "FL",
            "delivery_city": "Chicago",
            "delivery_state": "IL",
            "shipping_type": "expedited",
            "price": 2000,
            "status": "quoted"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        assert create_response.status_code == 200
        quote = create_response.json()
        
        # Convert to order
        convert_response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        assert convert_response.status_code == 200, f"Convert failed: {convert_response.text}"
        order = convert_response.json()
        
        # Verify order structure
        assert "id" in order
        assert "order_number" in order
        assert order["order_number"].startswith("ORD")
        assert order["quote_id"] == quote["id"]
        assert order["customer_name"] == quote["customer_name"]
        assert order["phone"] == quote["phone"]
        assert order["price"] == quote["price"]
        assert order["status"] == "pending"
        
        # Verify quote status changed to 'order'
        quote_response = requests.get(f"{BASE_URL}/api/quotes/{quote['id']}", headers=auth_headers)
        assert quote_response.status_code == 200
        updated_quote = quote_response.json()
        assert updated_quote["status"] == "order"
        
        print(f"✓ Converted quote {quote['quote_number']} to order {order['order_number']}")
        return order
    
    def test_convert_already_converted_quote(self, auth_headers):
        """Test that converting an already converted quote fails"""
        # Create and convert a quote
        new_quote = {
            "customer_name": "TEST_Double Convert",
            "phone": "555-111-2222",
            "price": 1500,
            "status": "quoted"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        quote = create_response.json()
        
        # First conversion should succeed
        convert_response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        assert convert_response.status_code == 200
        
        # Second conversion should fail
        convert_response2 = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        assert convert_response2.status_code == 400
        assert "already exists" in convert_response2.json().get("detail", "").lower()
        
        print("✓ Double conversion correctly rejected")


class TestOrders:
    """Orders CRUD tests"""
    
    def test_get_orders_paginated(self, auth_headers):
        """Test orders list with pagination"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers, params={
            "skip": 0, "limit": 100
        })
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "orders" in data
        assert "total" in data
        assert isinstance(data["orders"], list)
        
        print(f"✓ Orders pagination: {len(data['orders'])} of {data['total']} orders")
        return data
    
    def test_get_single_order(self, auth_headers):
        """Test get single order by ID"""
        # First create an order via quote conversion
        new_quote = {
            "customer_name": "TEST_Order Detail",
            "phone": "555-333-4444",
            "price": 1200,
            "status": "quoted"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        quote = create_response.json()
        
        convert_response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        order = convert_response.json()
        
        # Get the order
        response = requests.get(f"{BASE_URL}/api/orders/{order['id']}", headers=auth_headers)
        assert response.status_code == 200
        fetched = response.json()
        
        # Verify order structure
        assert fetched["id"] == order["id"]
        assert fetched["order_number"] == order["order_number"]
        assert fetched["customer_name"] == new_quote["customer_name"]
        assert "carrier_name" in fetched
        assert "driver_name" in fetched
        assert "dispatch_notes" in fetched
        
        print(f"✓ Get single order {order['order_number']}")
        return order
    
    def test_update_order_status(self, auth_headers):
        """Test updating order status through all stages"""
        # Create an order
        new_quote = {
            "customer_name": "TEST_Status Update",
            "phone": "555-555-5555",
            "price": 1800,
            "status": "quoted"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        quote = create_response.json()
        
        convert_response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        order = convert_response.json()
        
        # Test status progression
        statuses = ["assigned", "picked_up", "in_transit", "delivered"]
        for status in statuses:
            update_response = requests.put(f"{BASE_URL}/api/orders/{order['id']}", headers=auth_headers, json={
                "status": status
            })
            assert update_response.status_code == 200, f"Update to {status} failed"
            updated = update_response.json()
            assert updated["status"] == status
            
            # Verify by GET
            get_response = requests.get(f"{BASE_URL}/api/orders/{order['id']}", headers=auth_headers)
            assert get_response.json()["status"] == status
            
            print(f"✓ Order status updated to '{status}'")
    
    def test_update_order_dispatch_fields(self, auth_headers):
        """Test updating order dispatch fields"""
        # Create an order
        new_quote = {
            "customer_name": "TEST_Dispatch Fields",
            "phone": "555-666-7777",
            "price": 2200,
            "status": "quoted"
        }
        create_response = requests.post(f"{BASE_URL}/api/quotes", headers=auth_headers, json=new_quote)
        quote = create_response.json()
        
        convert_response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=auth_headers)
        order = convert_response.json()
        
        # Update dispatch fields
        dispatch_data = {
            "carrier_name": "Fast Transport LLC",
            "carrier_phone": "800-123-4567",
            "carrier_mc": "MC123456",
            "driver_name": "John Driver",
            "driver_phone": "555-888-9999",
            "dispatch_notes": "Handle with care - classic vehicle"
        }
        update_response = requests.put(f"{BASE_URL}/api/orders/{order['id']}", headers=auth_headers, json=dispatch_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        # Verify all fields
        assert updated["carrier_name"] == dispatch_data["carrier_name"]
        assert updated["carrier_phone"] == dispatch_data["carrier_phone"]
        assert updated["carrier_mc"] == dispatch_data["carrier_mc"]
        assert updated["driver_name"] == dispatch_data["driver_name"]
        assert updated["driver_phone"] == dispatch_data["driver_phone"]
        assert updated["dispatch_notes"] == dispatch_data["dispatch_notes"]
        
        print(f"✓ Order dispatch fields updated")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_quotes(self, auth_headers):
        """Delete test quotes created during testing"""
        # Get all quotes with TEST_ prefix
        response = requests.get(f"{BASE_URL}/api/quotes", headers=auth_headers, params={
            "search": "TEST_", "limit": 100
        })
        if response.status_code == 200:
            quotes = response.json()["quotes"]
            deleted = 0
            for quote in quotes:
                if quote["customer_name"].startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/quotes/{quote['id']}", headers=auth_headers)
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test quotes")
    
    def test_cleanup_test_orders(self, auth_headers):
        """Delete test orders created during testing"""
        response = requests.get(f"{BASE_URL}/api/orders", headers=auth_headers, params={
            "search": "TEST_", "limit": 100
        })
        if response.status_code == 200:
            orders = response.json()["orders"]
            deleted = 0
            for order in orders:
                if order.get("customer_name", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/orders/{order['id']}", headers=auth_headers)
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
