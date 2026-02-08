#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime
import uuid

class CementionAPITester:
    def __init__(self, base_url="https://b2b-cement-trade.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.demo_otp = None
        
        # Test data
        self.test_phone = "+919876543210"
        self.admin_phone = "+911234567890"
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=False):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}" if not endpoint.startswith('/api') else f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}", "ERROR")
                except:
                    self.log(f"   Error: {response.text}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "FAIL")
            return False, {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        self.log("\n🔍 TESTING AUTH FLOW", "SECTION")
        
        # Test send OTP
        success, response = self.run_test(
            "Send OTP",
            "POST",
            "/auth/send-otp",
            200,
            {"phone": self.test_phone}
        )
        
        if not success:
            return False
            
        # Store demo OTP
        if response.get('otp'):
            self.demo_otp = response['otp']
            self.log(f"Demo OTP received: {self.demo_otp}")
        
        # Test verify OTP
        if self.demo_otp:
            success, response = self.run_test(
                "Verify OTP",
                "POST",
                "/auth/verify-otp",
                200,
                {"phone": self.test_phone, "otp": self.demo_otp}
            )
            
            if not success:
                return False
        
        # Test register new user - Customer
        success, response = self.run_test(
            "Register Customer",
            "POST",
            "/auth/register",
            200,
            {
                "phone": self.test_phone,
                "role": "CUSTOMER", 
                "name": "Test Customer",
                "email": "test@customer.com"
            }
        )
        
        if success and response.get('token'):
            self.token = response['token']
            self.log("Authentication token obtained")
            return True
        
        return False
    
    def test_dealer_registration(self):
        """Test dealer registration with GST details"""
        self.log("\n🔍 TESTING DEALER REGISTRATION", "SECTION")
        
        dealer_phone = "+919876543211"
        
        # Send OTP
        success, response = self.run_test(
            "Send OTP for Dealer",
            "POST", 
            "/auth/send-otp",
            200,
            {"phone": dealer_phone}
        )
        
        if not success:
            return False
            
        demo_otp = response.get('otp')
        
        if demo_otp:
            # Verify OTP
            success, response = self.run_test(
                "Verify OTP for Dealer",
                "POST",
                "/auth/verify-otp", 
                200,
                {"phone": dealer_phone, "otp": demo_otp}
            )
        
        # Register dealer with GST details
        success, response = self.run_test(
            "Register Dealer",
            "POST",
            "/auth/register",
            200,
            {
                "phone": dealer_phone,
                "role": "DEALER",
                "name": "Test Dealer",
                "email": "dealer@test.com",
                "business_name": "Test Cement Business",
                "brand_shop_name": "Test Cement Shop",
                "gst_number": "29ABCDE1234F1Z5",
                "gst_registered_name": "Test Cement Business Pvt Ltd"
            }
        )
        
        if success:
            user = response.get('user', {})
            if user.get('status') == 'PENDING':
                self.log("✅ Dealer registered with PENDING status (correct)")
                return True
        
        return False
    
    def test_products_api(self):
        """Test products API"""
        self.log("\n🔍 TESTING PRODUCTS API", "SECTION")
        
        # Test get products (requires authentication and approved status)
        success, response = self.run_test(
            "Get Products",
            "GET",
            "/products",
            200,
            auth_required=True
        )
        
        if success:
            products = response
            self.log(f"Found {len(products)} products")
            
            if len(products) > 0:
                product = products[0]
                required_fields = ['id', 'name', 'brand', 'user_price', 'base_price_customer', 'min_quantity']
                missing = [f for f in required_fields if f not in product]
                
                if not missing:
                    self.log("✅ Product structure is correct")
                    
                    # Test get single product
                    success, response = self.run_test(
                        "Get Single Product",
                        "GET",
                        f"/products/{product['id']}",
                        200,
                        auth_required=True
                    )
                    return success
                else:
                    self.log(f"❌ Missing product fields: {missing}")
        
        return success
    
    def test_cart_api(self):
        """Test cart API"""
        self.log("\n🔍 TESTING CART API", "SECTION")
        
        # Get products first
        success, products = self.run_test(
            "Get Products for Cart Test",
            "GET",
            "/products", 
            200,
            auth_required=True
        )
        
        if not success or not products:
            return False
            
        product = products[0]
        product_id = product['id']
        
        # Test get empty cart
        success, response = self.run_test(
            "Get Empty Cart",
            "GET",
            "/cart",
            200,
            auth_required=True
        )
        
        # Test add to cart
        success, response = self.run_test(
            "Add to Cart",
            "POST", 
            "/cart/add",
            200,
            {"product_id": product_id, "quantity": 100},
            auth_required=True
        )
        
        if not success:
            return False
        
        # Test get cart with items
        success, response = self.run_test(
            "Get Cart with Items",
            "GET",
            "/cart", 
            200,
            auth_required=True
        )
        
        if success:
            cart = response
            if cart.get('items') and len(cart['items']) > 0:
                self.log("✅ Cart contains items")
                
                # Test quantity validation (< 100 bags should fail)
                success, response = self.run_test(
                    "Add Invalid Quantity (< 100)",
                    "POST",
                    "/cart/add",
                    400,  # Should fail
                    {"product_id": product_id, "quantity": 50},
                    auth_required=True
                )
                
                # Test remove from cart
                success, response = self.run_test(
                    "Remove from Cart",
                    "DELETE",
                    f"/cart/remove/{product_id}",
                    200,
                    auth_required=True
                )
                
                return True
        
        return False
    
    def test_address_api(self):
        """Test address API"""
        self.log("\n🔍 TESTING ADDRESS API", "SECTION")
        
        # Test get empty addresses
        success, response = self.run_test(
            "Get Addresses",
            "GET",
            "/addresses",
            200,
            auth_required=True
        )
        
        # Test create address
        address_data = {
            "address_line1": "123 Test Street",
            "city": "Mumbai",
            "state": "Maharashtra", 
            "pincode": "400001",
            "is_default": True
        }
        
        success, response = self.run_test(
            "Create Address",
            "POST",
            "/addresses",
            200,
            address_data,
            auth_required=True
        )
        
        if success:
            address = response
            address_id = address.get('id')
            
            if address_id:
                # Test delete address
                success, response = self.run_test(
                    "Delete Address",
                    "DELETE",
                    f"/addresses/{address_id}",
                    200,
                    auth_required=True
                )
                return success
        
        return False
    
    def test_order_flow(self):
        """Test order creation flow"""
        self.log("\n🔍 TESTING ORDER FLOW", "SECTION")
        
        # Add product to cart first
        success, products = self.run_test(
            "Get Products for Order Test",
            "GET",
            "/products",
            200,
            auth_required=True
        )
        
        if not success or not products:
            return False
            
        product = products[0]
        
        success, response = self.run_test(
            "Add to Cart for Order",
            "POST",
            "/cart/add", 
            200,
            {"product_id": product['id'], "quantity": 150},
            auth_required=True
        )
        
        if not success:
            return False
        
        # Create address for delivery
        address_data = {
            "address_line1": "456 Delivery Street",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001"
        }
        
        success, address_response = self.run_test(
            "Create Delivery Address",
            "POST",
            "/addresses",
            200,
            address_data,
            auth_required=True
        )
        
        if not success:
            return False
        
        address_id = address_response.get('id')
        
        # Test create order
        order_data = {
            "delivery_address_id": address_id,
            "payment_method": "UPI"
        }
        
        success, order_response = self.run_test(
            "Create Order",
            "POST",
            "/orders/create",
            200,
            order_data,
            auth_required=True
        )
        
        if success:
            order = order_response
            
            # Verify order structure
            required_fields = ['id', 'order_number', 'items', 'subtotal', 'gst_amount', 'total_amount']
            missing = [f for f in required_fields if f not in order]
            
            if not missing:
                self.log("✅ Order structure is correct")
                
                # Test get my orders
                success, response = self.run_test(
                    "Get My Orders",
                    "GET",
                    "/orders/my-orders",
                    200,
                    auth_required=True
                )
                
                if success:
                    orders = response
                    if len(orders) > 0:
                        self.log(f"✅ Found {len(orders)} orders")
                        return True
            else:
                self.log(f"❌ Missing order fields: {missing}")
        
        return False
    
    def test_admin_apis(self):
        """Test admin APIs with admin user"""
        self.log("\n🔍 TESTING ADMIN APIS", "SECTION")
        
        # Try to login admin user
        success, response = self.run_test(
            "Send OTP to Admin",
            "POST",
            "/auth/send-otp", 
            200,
            {"phone": self.admin_phone}
        )
        
        if success:
            admin_otp = response.get('otp')
            if admin_otp:
                success, response = self.run_test(
                    "Verify Admin OTP",
                    "POST",
                    "/auth/verify-otp",
                    200,
                    {"phone": self.admin_phone, "otp": admin_otp}
                )
                
                # Try login admin
                success, response = self.run_test(
                    "Admin Login",
                    "POST",
                    "/auth/login",
                    200,
                    {"phone": self.admin_phone}
                )
                
                if success and response.get('token'):
                    old_token = self.token
                    self.token = response['token']
                    
                    # Test admin endpoints
                    success, response = self.run_test(
                        "Get Pending Users",
                        "GET",
                        "/admin/users/pending",
                        200,
                        auth_required=True
                    )
                    
                    if success:
                        self.log(f"Found {len(response)} pending users")
                    
                    success, response = self.run_test(
                        "Get All Orders (Admin)",
                        "GET",
                        "/admin/orders",
                        200,
                        auth_required=True
                    )
                    
                    # Restore original token
                    self.token = old_token
                    return success
        
        return False
    
    def run_all_tests(self):
        """Run all test suites"""
        self.log("🚀 STARTING CEMENTION API TESTS", "START")
        self.log(f"Backend URL: {self.base_url}")
        
        try:
            # Test authentication flow
            if not self.test_auth_flow():
                self.log("❌ Auth flow failed - stopping tests", "CRITICAL")
                return False
            
            # Test dealer registration
            self.test_dealer_registration()
            
            # Test products API
            if not self.test_products_api():
                self.log("❌ Products API failed", "ERROR")
            
            # Test cart API
            if not self.test_cart_api():
                self.log("❌ Cart API failed", "ERROR")
            
            # Test address API
            if not self.test_address_api():
                self.log("❌ Address API failed", "ERROR")
                
            # Test order flow
            if not self.test_order_flow():
                self.log("❌ Order flow failed", "ERROR")
            
            # Test admin APIs
            if not self.test_admin_apis():
                self.log("❌ Admin APIs failed", "ERROR")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Test execution failed: {str(e)}", "CRITICAL")
            return False

def main():
    tester = CementionAPITester()
    
    try:
        success = tester.run_all_tests()
        
        print(f"\n📊 TEST RESULTS:")
        print(f"Tests Run: {tester.tests_run}")
        print(f"Tests Passed: {tester.tests_passed}")
        print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        
        if success:
            print("🎉 Backend API testing completed successfully!")
        else:
            print("❌ Some critical tests failed!")
            
        return 0 if tester.tests_passed >= (tester.tests_run * 0.8) else 1
        
    except Exception as e:
        print(f"❌ Test runner failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())