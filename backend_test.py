import requests
import sys
from datetime import datetime
import json
import time

class DayTradingAPITester:
    def __init__(self, base_url="https://trade-practice-19.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, message="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "message": message,
            "response_data": response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {message}")
        
        return success

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    message = f"Status: {response.status_code}"
                    return self.log_test(name, True, message, response_data), response_data
                except:
                    message = f"Status: {response.status_code} (no JSON response)"
                    return self.log_test(name, True, message), {}
            else:
                try:
                    error_data = response.json()
                    message = f"Expected {expected_status}, got {response.status_code} - {error_data.get('detail', 'No error message')}"
                except:
                    message = f"Expected {expected_status}, got {response.status_code}"
                return self.log_test(name, False, message), {}

        except Exception as e:
            message = f"Request failed: {str(e)}"
            return self.log_test(name, False, message), {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.run_test("Root Endpoint", "GET", "", 200)
        return success

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, data = self.run_test("User Registration", "POST", "auth/register", 200, test_user)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_data = data['user']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing user"""
        if not self.user_data:
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, data = self.run_test("User Login", "POST", "auth/login", 200, login_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            return True
        return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        success, data = self.run_test("Get User Profile", "GET", "auth/me", 200)
        return success and 'id' in data

    def test_get_stocks(self):
        """Test getting stock list"""
        success, data = self.run_test("Get Stocks", "GET", "stocks", 200)
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if first stock has required fields
            stock = data[0]
            required_fields = ['symbol', 'name', 'price', 'change', 'change_percent']
            return all(field in stock for field in required_fields)
        return False

    def test_get_single_stock(self):
        """Test getting single stock data"""
        success, data = self.run_test("Get Single Stock (AAPL)", "GET", "stocks/AAPL", 200)
        
        if success and 'symbol' in data:
            return data['symbol'] == 'AAPL'
        return False

    def test_get_stock_history(self):
        """Test getting stock price history"""
        success, data = self.run_test("Get Stock History (AAPL)", "GET", "stocks/AAPL/history?minutes=10", 200)
        
        if success and isinstance(data, list) and len(data) > 0:
            # Check if price point has required fields
            point = data[0]
            required_fields = ['time', 'open', 'high', 'low', 'close', 'volume']
            return all(field in point for field in required_fields)
        return False

    def test_get_portfolio(self):
        """Test getting user portfolio"""
        success, data = self.run_test("Get Portfolio", "GET", "portfolio", 200)
        
        if success:
            required_fields = ['balance', 'portfolio_value', 'total_value', 'total_pnl', 'positions']
            return all(field in data for field in required_fields)
        return False

    def test_buy_stock(self):
        """Test buying stock"""
        # Get current stock price first
        success, stock_data = self.run_test("Get AAPL for Trading", "GET", "stocks/AAPL", 200)
        if not success:
            return False
            
        trade_data = {
            "symbol": "AAPL",
            "action": "buy",
            "quantity": 10,
            "price": stock_data['price']
        }
        
        success, data = self.run_test("Buy Stock (10 AAPL)", "POST", "trades", 200, trade_data)
        
        if success and 'id' in data:
            self.trade_id = data['id']
            return data['action'] == 'buy' and data['symbol'] == 'AAPL' and data['quantity'] == 10
        return False

    def test_sell_stock(self):
        """Test selling stock"""
        # Get current stock price
        success, stock_data = self.run_test("Get AAPL for Selling", "GET", "stocks/AAPL", 200)
        if not success:
            return False
            
        trade_data = {
            "symbol": "AAPL",
            "action": "sell",
            "quantity": 5,
            "price": stock_data['price']
        }
        
        success, data = self.run_test("Sell Stock (5 AAPL)", "POST", "trades", 200, trade_data)
        
        if success and 'id' in data:
            return data['action'] == 'sell' and data['symbol'] == 'AAPL' and data['quantity'] == 5
        return False

    def test_get_trades(self):
        """Test getting trade history"""
        success, data = self.run_test("Get Trades", "GET", "trades?limit=10", 200)
        
        if success and isinstance(data, list):
            # Should have at least 2 trades from buy/sell tests
            return len(data) >= 2
        return False

    def test_create_journal_entry(self):
        """Test creating journal entry"""
        journal_data = {
            "title": "Test Journal Entry",
            "content": "This is a test journal entry to verify the API is working.",
            "symbol": "AAPL",
            "sentiment": "bullish",
            "lessons": "Always test your APIs thoroughly!"
        }
        
        success, data = self.run_test("Create Journal Entry", "POST", "journal", 200, journal_data)
        
        if success and 'id' in data:
            self.journal_id = data['id']
            return data['title'] == journal_data['title']
        return False

    def test_get_journal_entries(self):
        """Test getting journal entries"""
        success, data = self.run_test("Get Journal Entries", "GET", "journal?limit=10", 200)
        
        if success and isinstance(data, list):
            return len(data) >= 1
        return False

    def test_delete_journal_entry(self):
        """Test deleting journal entry"""
        if not hasattr(self, 'journal_id'):
            return False
            
        success, data = self.run_test("Delete Journal Entry", "DELETE", f"journal/{self.journal_id}", 200)
        return success

    def test_get_analytics(self):
        """Test getting performance analytics"""
        success, data = self.run_test("Get Analytics", "GET", "analytics/performance", 200)
        
        if success:
            required_fields = ['total_trades', 'buy_trades', 'sell_trades', 'total_volume']
            return all(field in data for field in required_fields)
        return False

    def test_reset_account(self):
        """Test account reset"""
        success, data = self.run_test("Reset Account", "POST", "reset", 200)
        
        if success:
            return data.get('balance') == 100000.00
        return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting DayTradingPro API Tests...")
        print("=" * 60)
        
        # Test sequence
        test_sequence = [
            ("API Root", self.test_root_endpoint),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get User Profile", self.test_get_user_profile),
            ("Get Stocks List", self.test_get_stocks),
            ("Get Single Stock", self.test_get_single_stock),
            ("Get Stock History", self.test_get_stock_history),
            ("Get Portfolio", self.test_get_portfolio),
            ("Buy Stock", self.test_buy_stock),
            ("Get Portfolio After Buy", self.test_get_portfolio),
            ("Sell Stock", self.test_sell_stock),
            ("Get Portfolio After Sell", self.test_get_portfolio),
            ("Get Trade History", self.test_get_trades),
            ("Create Journal Entry", self.test_create_journal_entry),
            ("Get Journal Entries", self.test_get_journal_entries),
            ("Delete Journal Entry", self.test_delete_journal_entry),
            ("Get Analytics", self.test_get_analytics),
            ("Reset Account", self.test_reset_account)
        ]
        
        for test_name, test_func in test_sequence:
            print(f"\n📋 Running: {test_name}")
            try:
                test_func()
                # Small delay between tests
                time.sleep(0.5)
            except Exception as e:
                self.log_test(test_name, False, f"Test execution failed: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        # Save detailed results
        results_file = f"/app/test_reports/backend_api_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "tests_run": self.tests_run,
                    "tests_passed": self.tests_passed,
                    "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
                },
                "test_results": self.test_results
            }, f, indent=2)
        
        print(f"📋 Detailed results saved to: {results_file}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DayTradingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())