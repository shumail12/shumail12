"""
Test suite for new features in iteration 8:
- Auto-calculate pricing (total = deposit + carrier + mileage)
- Lead pricing endpoint with all 3 shipping types
- Lead approve endpoint (saves all 3 pricing types, converts to quote)
- Quote update with pricing_standard, pricing_expedited, pricing_enclosed
- Order update with pricing fields and zip codes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Get authentication token for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "shumail.s",
            "password": "HONDA@2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for requests"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestLeadPricing(TestAuth):
    """Test GET /api/leads/pricing/{id} - returns pricing for all 3 types with distance"""
    
    def test_get_lead_pricing_returns_all_types(self, headers):
        """Test that pricing endpoint returns standard, expedited, enclosed pricing"""
        # First get a lead with pickup/delivery states
        response = requests.get(f"{BASE_URL}/api/leads", headers=headers, params={"limit": 10})
        assert response.status_code == 200
        leads = response.json().get("leads", [])
        
        # Find a lead with pickup and delivery states
        test_lead = None
        for lead in leads:
            if lead.get("pickup_state") and lead.get("delivery_state"):
                test_lead = lead
                break
        
        if not test_lead:
            pytest.skip("No lead with pickup/delivery states found")
        
        # Get pricing for this lead
        lead_id = test_lead["id"]
        response = requests.get(f"{BASE_URL}/api/leads/pricing/{lead_id}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        print(f"Pricing response: {data}")
        
        # Verify distance is returned
        if data.get("distance_miles"):
            assert data["distance_miles"] > 0, "Distance should be positive"
            
            # Verify all 3 pricing types are returned
            pricing = data.get("pricing")
            assert pricing is not None, "Pricing should be returned"
            
            for ship_type in ["standard", "expedited", "enclosed"]:
                assert ship_type in pricing, f"{ship_type} pricing should be present"
                p = pricing[ship_type]
                assert "deposit_fee" in p, f"{ship_type} should have deposit_fee"
                assert "carrier_fee" in p, f"{ship_type} should have carrier_fee"
                assert "total_price" in p, f"{ship_type} should have total_price"
                assert "rate_per_mile" in p, f"{ship_type} should have rate_per_mile"
                
                # Verify total = deposit + carrier + mile_cost
                expected_total = p["deposit_fee"] + p["carrier_fee"] + p.get("mile_cost", 0)
                assert abs(p["total_price"] - expected_total) < 0.01, f"{ship_type} total should equal deposit + carrier + mile_cost"
        else:
            print("Distance could not be calculated - cities may not be in database")
    
    def test_get_lead_pricing_404_for_invalid_id(self, headers):
        """Test that pricing endpoint returns 404 for non-existent lead"""
        response = requests.get(f"{BASE_URL}/api/leads/pricing/invalid-id-12345", headers=headers)
        assert response.status_code == 404


class TestLeadApprove(TestAuth):
    """Test POST /api/leads/{id}/approve - saves all 3 pricing types and converts to quote"""
    
    @pytest.fixture(scope="class")
    def test_lead(self, headers):
        """Create a test lead for approval testing"""
        lead_data = {
            "customer_name": "TEST_ApproveTest Customer",
            "phone": "555-0123",
            "email": "test_approve@example.com",
            "vehicle_year": "2024",
            "vehicle_make": "Tesla",
            "vehicle_model": "Model 3",
            "pickup_city": "Los Angeles",
            "pickup_state": "CA",
            "pickup_zip": "90001",
            "delivery_city": "Houston",
            "delivery_state": "TX",
            "delivery_zip": "77001",
            "status": "lead"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", headers=headers, json=lead_data)
        assert response.status_code == 200
        return response.json()
    
    def test_approve_lead_with_all_pricing_types(self, headers, test_lead):
        """Test that approve endpoint saves all 3 pricing types and converts to quote"""
        lead_id = test_lead["id"]
        
        # Approve with all 3 pricing types
        approve_data = {
            "pricing_standard": {"deposit_fee": 150, "carrier_fee": 60, "total_price": 1210},
            "pricing_expedited": {"deposit_fee": 175, "carrier_fee": 70, "total_price": 1445},
            "pricing_enclosed": {"deposit_fee": 200, "carrier_fee": 85, "total_price": 1585},
            "estimated_distance": 1500
        }
        
        response = requests.post(f"{BASE_URL}/api/leads/{lead_id}/approve", headers=headers, json=approve_data)
        assert response.status_code == 200, f"Approve failed: {response.text}"
        
        data = response.json()
        print(f"Approve response: {data}")
        
        # Verify status changed to quoted
        assert data["status"] == "quoted", "Status should be 'quoted' after approval"
        
        # Verify all 3 pricing types are saved
        assert data.get("pricing_standard") == approve_data["pricing_standard"], "pricing_standard should be saved"
        assert data.get("pricing_expedited") == approve_data["pricing_expedited"], "pricing_expedited should be saved"
        assert data.get("pricing_enclosed") == approve_data["pricing_enclosed"], "pricing_enclosed should be saved"
        
        # Verify distance is saved
        assert data.get("estimated_distance") == 1500, "estimated_distance should be saved"
        
        # Verify primary price is set from standard
        assert data.get("price") == 1210, "Primary price should be set from standard total"
        assert data.get("deposit_fee") == 150, "deposit_fee should be set from standard"
        assert data.get("carrier_fee") == 60, "carrier_fee should be set from standard"
    
    def test_approve_already_quoted_fails(self, headers, test_lead):
        """Test that approving an already quoted lead fails"""
        lead_id = test_lead["id"]
        
        approve_data = {
            "pricing_standard": {"deposit_fee": 150, "carrier_fee": 60, "total_price": 1210},
            "pricing_expedited": {"deposit_fee": 175, "carrier_fee": 70, "total_price": 1445},
            "pricing_enclosed": {"deposit_fee": 200, "carrier_fee": 85, "total_price": 1585},
            "estimated_distance": 1500
        }
        
        response = requests.post(f"{BASE_URL}/api/leads/{lead_id}/approve", headers=headers, json=approve_data)
        assert response.status_code == 400, "Should fail for already quoted lead"
    
    def test_approve_invalid_lead_404(self, headers):
        """Test that approving non-existent lead returns 404"""
        approve_data = {
            "pricing_standard": {"deposit_fee": 150, "carrier_fee": 60, "total_price": 210},
            "pricing_expedited": {"deposit_fee": 175, "carrier_fee": 70, "total_price": 245},
            "pricing_enclosed": {"deposit_fee": 200, "carrier_fee": 85, "total_price": 285},
        }
        
        response = requests.post(f"{BASE_URL}/api/leads/invalid-id-12345/approve", headers=headers, json=approve_data)
        assert response.status_code == 404


class TestQuotePricingUpdate(TestAuth):
    """Test PUT /api/quotes/{id} - saves pricing_standard, pricing_expedited, pricing_enclosed"""
    
    @pytest.fixture(scope="class")
    def test_quote(self, headers):
        """Create a test quote for update testing"""
        quote_data = {
            "customer_name": "TEST_QuoteUpdate Customer",
            "phone": "555-0456",
            "email": "test_quote_update@example.com",
            "vehicle_year": "2023",
            "vehicle_make": "BMW",
            "vehicle_model": "X5",
            "pickup_city": "Miami",
            "pickup_state": "FL",
            "pickup_zip": "33101",
            "delivery_city": "Atlanta",
            "delivery_state": "GA",
            "delivery_zip": "30301",
            "status": "quoted"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", headers=headers, json=quote_data)
        assert response.status_code == 200
        return response.json()
    
    def test_update_quote_with_all_pricing_types(self, headers, test_quote):
        """Test that quote update saves all 3 pricing types"""
        quote_id = test_quote["id"]
        
        update_data = {
            "pricing_standard": {"deposit_fee": 160, "carrier_fee": 65, "total_price": 825},
            "pricing_expedited": {"deposit_fee": 185, "carrier_fee": 75, "total_price": 1060},
            "pricing_enclosed": {"deposit_fee": 210, "carrier_fee": 90, "total_price": 1100},
            "estimated_distance": 600,
            "pickup_zip": "33102",
            "delivery_zip": "30302"
        }
        
        response = requests.put(f"{BASE_URL}/api/quotes/{quote_id}", headers=headers, json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        print(f"Quote update response: {data}")
        
        # Verify all 3 pricing types are saved
        assert data.get("pricing_standard") == update_data["pricing_standard"], "pricing_standard should be saved"
        assert data.get("pricing_expedited") == update_data["pricing_expedited"], "pricing_expedited should be saved"
        assert data.get("pricing_enclosed") == update_data["pricing_enclosed"], "pricing_enclosed should be saved"
        
        # Verify distance and zip codes are saved
        assert data.get("estimated_distance") == 600, "estimated_distance should be saved"
        assert data.get("pickup_zip") == "33102", "pickup_zip should be saved"
        assert data.get("delivery_zip") == "30302", "delivery_zip should be saved"


class TestOrderPricingUpdate(TestAuth):
    """Test PUT /api/orders/{id} - saves pricing fields and zip codes"""
    
    @pytest.fixture(scope="class")
    def test_order(self, headers):
        """Create a test quote and convert to order"""
        # Create quote
        quote_data = {
            "customer_name": "TEST_OrderUpdate Customer",
            "phone": "555-0789",
            "email": "test_order_update@example.com",
            "vehicle_year": "2022",
            "vehicle_make": "Mercedes",
            "vehicle_model": "E-Class",
            "pickup_city": "Seattle",
            "pickup_state": "WA",
            "pickup_zip": "98101",
            "delivery_city": "Portland",
            "delivery_state": "OR",
            "delivery_zip": "97201",
            "status": "quoted"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", headers=headers, json=quote_data)
        assert response.status_code == 200
        quote = response.json()
        
        # Convert to order
        response = requests.post(f"{BASE_URL}/api/quotes/{quote['id']}/convert-to-order", headers=headers)
        assert response.status_code == 200
        return response.json()
    
    def test_update_order_with_all_pricing_types(self, headers, test_order):
        """Test that order update saves all 3 pricing types and zip codes"""
        order_id = test_order["id"]
        
        update_data = {
            "pricing_standard": {"deposit_fee": 140, "carrier_fee": 55, "total_price": 395},
            "pricing_expedited": {"deposit_fee": 165, "carrier_fee": 65, "total_price": 530},
            "pricing_enclosed": {"deposit_fee": 190, "carrier_fee": 80, "total_price": 570},
            "estimated_distance": 175,
            "pickup_zip": "98102",
            "delivery_zip": "97202",
            "carrier_name": "TEST Carrier Inc",
            "driver_name": "TEST Driver"
        }
        
        response = requests.put(f"{BASE_URL}/api/orders/{order_id}", headers=headers, json=update_data)
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        data = response.json()
        print(f"Order update response: {data}")
        
        # Verify all 3 pricing types are saved
        assert data.get("pricing_standard") == update_data["pricing_standard"], "pricing_standard should be saved"
        assert data.get("pricing_expedited") == update_data["pricing_expedited"], "pricing_expedited should be saved"
        assert data.get("pricing_enclosed") == update_data["pricing_enclosed"], "pricing_enclosed should be saved"
        
        # Verify distance and zip codes are saved
        assert data.get("estimated_distance") == 175, "estimated_distance should be saved"
        assert data.get("pickup_zip") == "98102", "pickup_zip should be saved"
        assert data.get("delivery_zip") == "97202", "delivery_zip should be saved"
        
        # Verify carrier/driver info saved
        assert data.get("carrier_name") == "TEST Carrier Inc", "carrier_name should be saved"
        assert data.get("driver_name") == "TEST Driver", "driver_name should be saved"


class TestDistanceCalculation(TestAuth):
    """Test distance calculation for known city pairs"""
    
    def test_la_to_houston_distance(self, headers):
        """Test distance calculation for LA to Houston (known route)"""
        # Create a lead with LA to Houston route
        lead_data = {
            "customer_name": "TEST_Distance Customer",
            "pickup_city": "Los Angeles",
            "pickup_state": "CA",
            "delivery_city": "Houston",
            "delivery_state": "TX",
            "status": "lead"
        }
        response = requests.post(f"{BASE_URL}/api/quotes", headers=headers, json=lead_data)
        assert response.status_code == 200
        lead = response.json()
        
        # Get pricing
        response = requests.get(f"{BASE_URL}/api/leads/pricing/{lead['id']}", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        distance = data.get("distance_miles")
        
        if distance:
            # LA to Houston is approximately 1,500-1,600 miles by road
            # Haversine * 1.3 should give roughly 1,400-1,600
            assert 1200 <= distance <= 1800, f"Distance {distance} should be between 1200-1800 miles"
            print(f"LA to Houston distance: {distance} miles")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/quotes/{lead['id']}", headers=headers)


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, headers):
        """Delete all TEST_ prefixed quotes and orders"""
        # Get all quotes
        response = requests.get(f"{BASE_URL}/api/quotes", headers=headers, params={"limit": 500})
        if response.status_code == 200:
            quotes = response.json().get("quotes", [])
            for q in quotes:
                if q.get("customer_name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/quotes/{q['id']}", headers=headers)
                    print(f"Deleted test quote: {q.get('quote_number')}")
        
        # Get all orders
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers, params={"limit": 500})
        if response.status_code == 200:
            orders = response.json().get("orders", [])
            for o in orders:
                if o.get("customer_name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/orders/{o['id']}", headers=headers)
                    print(f"Deleted test order: {o.get('order_number')}")
        
        print("Test data cleanup complete")
