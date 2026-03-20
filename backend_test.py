import requests
import sys
import json
from datetime import datetime, timedelta

class CRMAPITester:
    def __init__(self, base_url="https://transport-broker-hub.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_entities = {
            'leads': [],
            'quotes': [],
            'orders': [],
            'carriers': [],
            'invoices': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print(f"\n🔐 Testing Authentication with {username}")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Authentication successful, token received")
            return True
        print(f"❌ Authentication failed")
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_leads', 'total_quotes', 'total_orders', 'total_revenue', 
                             'pending_quotes', 'active_orders', 'delivered_orders', 'unpaid_invoices']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in dashboard stats: {field}")
                    return False
            print(f"✅ Dashboard stats complete with all required fields")
        return success

    def test_create_lead(self):
        """Create a test lead"""
        lead_data = {
            "customer_name": "John Doe",
            "phone": "+1-555-0123",
            "email": "john.doe@example.com",
            "vehicle_year": 2020,
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_type": "Sedan",
            "status": "new",
            "notes": "Test lead for CRM testing"
        }
        success, response = self.run_test(
            "Create Lead",
            "POST",
            "leads",
            200,
            data=lead_data
        )
        if success and 'id' in response:
            self.created_entities['leads'].append(response['id'])
            print(f"✅ Lead created with ID: {response['id']}")
        return success, response

    def test_get_leads(self):
        """Get all leads"""
        success, response = self.run_test(
            "Get Leads",
            "GET",
            "leads",
            200
        )
        if success:
            print(f"✅ Retrieved {len(response)} leads")
        return success

    def test_update_lead(self, lead_id):
        """Update a lead"""
        update_data = {
            "customer_name": "John Doe Updated",
            "phone": "+1-555-0123",
            "email": "john.doe.updated@example.com",
            "vehicle_year": 2020,
            "vehicle_make": "Toyota",
            "vehicle_model": "Camry",
            "vehicle_type": "Sedan",
            "status": "contacted",
            "notes": "Updated test lead"
        }
        success, response = self.run_test(
            "Update Lead",
            "PUT",
            f"leads/{lead_id}",
            200,
            data=update_data
        )
        return success

    def test_create_quote(self, lead_id):
        """Create a quote for a lead"""
        quote_data = {
            "lead_id": lead_id,
            "pickup_location": "123 Main St",
            "pickup_city": "Los Angeles",
            "pickup_state": "CA",
            "delivery_location": "456 Oak Ave",
            "delivery_city": "New York",
            "delivery_state": "NY",
            "distance": 2800.0,
            "vehicle_type": "Sedan",
            "price": 1690.0,
            "status": "pending",
            "notes": "Test quote for cross-country transport"
        }
        success, response = self.run_test(
            "Create Quote",
            "POST",
            "quotes",
            200,
            data=quote_data
        )
        if success and 'id' in response:
            self.created_entities['quotes'].append(response['id'])
            print(f"✅ Quote created with ID: {response['id']}")
        return success, response

    def test_get_quotes(self):
        """Get all quotes"""
        success, response = self.run_test(
            "Get Quotes",
            "GET",
            "quotes",
            200
        )
        if success:
            print(f"✅ Retrieved {len(response)} quotes")
        return success

    def test_update_quote_status(self, quote_id):
        """Update quote status to approved"""
        # First get the quote to get its current data
        success, quote_data = self.run_test(
            "Get Quote for Update",
            "GET",
            f"quotes/{quote_id}",
            200
        )
        if not success:
            return False
        
        # Update status to approved
        quote_data['status'] = 'approved'
        success, response = self.run_test(
            "Update Quote Status",
            "PUT",
            f"quotes/{quote_id}",
            200,
            data=quote_data
        )
        return success

    def test_create_carrier(self):
        """Create a test carrier"""
        carrier_data = {
            "name": "Fast Transport LLC",
            "phone": "+1-555-0456",
            "email": "dispatch@fasttransport.com",
            "mc_number": "MC-123456",
            "insurance_expiry": (datetime.now() + timedelta(days=365)).isoformat(),
            "active_shipments": 0,
            "status": "active"
        }
        success, response = self.run_test(
            "Create Carrier",
            "POST",
            "carriers",
            200,
            data=carrier_data
        )
        if success and 'id' in response:
            self.created_entities['carriers'].append(response['id'])
            print(f"✅ Carrier created with ID: {response['id']}")
        return success, response

    def test_get_carriers(self):
        """Get all carriers"""
        success, response = self.run_test(
            "Get Carriers",
            "GET",
            "carriers",
            200
        )
        if success:
            print(f"✅ Retrieved {len(response)} carriers")
        return success

    def test_create_order(self, quote_id):
        """Create an order from a quote"""
        order_data = {
            "quote_id": quote_id,
            "status": "pending",
            "pickup_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "delivery_date": (datetime.now() + timedelta(days=14)).isoformat(),
            "carrier_id": None,
            "notes": "Test order for transport"
        }
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        if success and 'id' in response:
            self.created_entities['orders'].append(response['id'])
            print(f"✅ Order created with ID: {response['id']}")
        return success, response

    def test_get_orders(self):
        """Get all orders"""
        success, response = self.run_test(
            "Get Orders",
            "GET",
            "orders",
            200
        )
        if success:
            print(f"✅ Retrieved {len(response)} orders")
        return success

    def test_assign_carrier_to_order(self, order_id, carrier_id):
        """Assign a carrier to an order"""
        # First get the order data
        success, order_data = self.run_test(
            "Get Order for Update",
            "GET",
            f"orders/{order_id}",
            200
        )
        if not success:
            return False
        
        # Update with carrier assignment
        order_data['carrier_id'] = carrier_id
        order_data['status'] = 'assigned'
        success, response = self.run_test(
            "Assign Carrier to Order",
            "PUT",
            f"orders/{order_id}",
            200,
            data=order_data
        )
        return success

    def test_create_invoice(self, order_id):
        """Create an invoice for an order"""
        invoice_data = {
            "order_id": order_id,
            "amount": 1690.0,
            "status": "unpaid",
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "paid_date": None,
            "notes": "Test invoice for transport service"
        }
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            self.created_entities['invoices'].append(response['id'])
            print(f"✅ Invoice created with ID: {response['id']}")
        return success, response

    def test_get_invoices(self):
        """Get all invoices"""
        success, response = self.run_test(
            "Get Invoices",
            "GET",
            "invoices",
            200
        )
        if success:
            print(f"✅ Retrieved {len(response)} invoices")
        return success

    def test_mark_invoice_paid(self, invoice_id):
        """Mark an invoice as paid"""
        # First get the invoice data
        success, invoice_data = self.run_test(
            "Get Invoice for Update",
            "GET",
            f"invoices/{invoice_id}",
            200
        )
        if not success:
            return False
        
        # Update status to paid
        invoice_data['status'] = 'paid'
        invoice_data['paid_date'] = datetime.now().isoformat()
        success, response = self.run_test(
            "Mark Invoice as Paid",
            "PUT",
            f"invoices/{invoice_id}",
            200,
            data=invoice_data
        )
        return success

def main():
    print("🚛 Starting CRM API Testing...")
    print("=" * 50)
    
    # Setup
    tester = CRMAPITester()
    
    # Test authentication
    if not tester.test_login("shumail.s", "HONDA@2026"):
        print("❌ Authentication failed, stopping tests")
        return 1

    # Test dashboard
    if not tester.test_dashboard_stats():
        print("❌ Dashboard stats failed")
        return 1

    # Test Leads workflow
    print(f"\n📋 Testing Leads Management...")
    lead_success, lead_data = tester.test_create_lead()
    if not lead_success:
        print("❌ Lead creation failed, stopping tests")
        return 1
    
    lead_id = lead_data.get('id')
    tester.test_get_leads()
    tester.test_update_lead(lead_id)

    # Test Quotes workflow
    print(f"\n💰 Testing Quotes Management...")
    quote_success, quote_data = tester.test_create_quote(lead_id)
    if not quote_success:
        print("❌ Quote creation failed")
        return 1
    
    quote_id = quote_data.get('id')
    tester.test_get_quotes()
    tester.test_update_quote_status(quote_id)

    # Test Carriers workflow
    print(f"\n🚚 Testing Carriers Management...")
    carrier_success, carrier_data = tester.test_create_carrier()
    if not carrier_success:
        print("❌ Carrier creation failed")
        return 1
    
    carrier_id = carrier_data.get('id')
    tester.test_get_carriers()

    # Test Orders workflow
    print(f"\n📦 Testing Orders Management...")
    order_success, order_data = tester.test_create_order(quote_id)
    if not order_success:
        print("❌ Order creation failed")
        return 1
    
    order_id = order_data.get('id')
    tester.test_get_orders()
    tester.test_assign_carrier_to_order(order_id, carrier_id)

    # Test Invoices workflow
    print(f"\n🧾 Testing Invoices Management...")
    invoice_success, invoice_data = tester.test_create_invoice(order_id)
    if not invoice_success:
        print("❌ Invoice creation failed")
        return 1
    
    invoice_id = invoice_data.get('id')
    tester.test_get_invoices()
    tester.test_mark_invoice_paid(invoice_id)

    # Final dashboard check
    print(f"\n📊 Final Dashboard Check...")
    tester.test_dashboard_stats()

    # Print results
    print(f"\n" + "=" * 50)
    print(f"📊 Test Results:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print(f"✅ All tests passed! CRM API is working correctly.")
        return 0
    else:
        print(f"❌ Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())