"""
Test suite for Auth endpoints including Login and Forgot Password flow
Tests: Login, Forgot Password, Reset Password, Rate Limiting
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
VALID_USERNAME = "shumail.s"
VALID_PASSWORD = "HONDA@2026"
SECURITY_ANSWER = "Shark"
TEST_NEW_PASSWORD = "TestPass123"


class TestLoginFlow:
    """Test login endpoint functionality"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": VALID_USERNAME,
            "password": VALID_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "token_type" in data, "Response should contain token_type"
        assert data["token_type"] == "bearer"
        assert "user" in data, "Response should contain user object"
        assert data["user"]["username"] == VALID_USERNAME
        print(f"✓ Login successful for user: {data['user']['full_name']}")
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": VALID_USERNAME,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower() or "password" in data["detail"].lower()
        print(f"✓ Wrong password correctly returns 401 with message: {data['detail']}")
    
    def test_login_wrong_username(self):
        """Test login with wrong username returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "nonexistent_user",
            "password": VALID_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Wrong username correctly returns 401 with message: {data['detail']}")


class TestForgotPasswordFlow:
    """Test forgot password and reset password endpoints"""
    
    def test_forgot_password_valid_superadmin(self):
        """Test forgot-password returns security question for valid superadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "username": VALID_USERNAME
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "security_question" in data, "Response should contain security_question"
        assert "username" in data, "Response should contain username"
        assert data["username"] == VALID_USERNAME
        assert data["security_question"] == "Who is your work?"
        print(f"✓ Forgot password returns security question: '{data['security_question']}'")
    
    def test_forgot_password_invalid_username(self):
        """Test forgot-password with invalid username returns 404"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "username": "nonexistent_user"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid username correctly returns 404: {data['detail']}")
    
    def test_reset_password_wrong_answer(self):
        """Test reset-password with wrong security answer returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": "WrongAnswer",
            "new_password": TEST_NEW_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "incorrect" in data["detail"].lower()
        print(f"✓ Wrong security answer correctly returns 401: {data['detail']}")
    
    def test_reset_password_success_and_restore(self):
        """Test full password reset flow and restore original password"""
        # Step 1: Reset password to new password
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": SECURITY_ANSWER,
            "new_password": TEST_NEW_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✓ Password reset successful: {data['message']}")
        
        # Step 2: Verify login with new password works
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": VALID_USERNAME,
            "password": TEST_NEW_PASSWORD
        })
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        print("✓ Login with new password successful")
        
        # Step 3: Restore original password
        restore_response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": SECURITY_ANSWER,
            "new_password": VALID_PASSWORD
        })
        assert restore_response.status_code == 200, f"Password restore failed: {restore_response.text}"
        print("✓ Original password restored")
        
        # Step 4: Verify login with original password works
        final_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": VALID_USERNAME,
            "password": VALID_PASSWORD
        })
        assert final_login.status_code == 200, f"Login with original password failed: {final_login.text}"
        print("✓ Login with original password verified")
    
    def test_reset_password_short_password(self):
        """Test reset-password with short password returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": SECURITY_ANSWER,
            "new_password": "abc"  # Too short
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "6 characters" in data["detail"]
        print(f"✓ Short password correctly returns 400: {data['detail']}")
    
    def test_security_answer_case_insensitive(self):
        """Test that security answer is case-insensitive"""
        # Test with lowercase
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": "shark",  # lowercase
            "new_password": TEST_NEW_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200 for lowercase answer, got {response.status_code}"
        print("✓ Security answer is case-insensitive (lowercase works)")
        
        # Restore password
        requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": "SHARK",  # uppercase
            "new_password": VALID_PASSWORD
        })
        print("✓ Security answer is case-insensitive (uppercase works)")


class TestRateLimiting:
    """Test rate limiting on reset-password endpoint"""
    
    def test_rate_limiting_after_5_attempts(self):
        """Test that rate limiting kicks in after 5 wrong attempts"""
        # Make 5 wrong attempts
        for i in range(5):
            response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "username": VALID_USERNAME,
                "security_answer": "WrongAnswer",
                "new_password": "SomePassword123"
            })
            if response.status_code == 429:
                print(f"✓ Rate limiting kicked in at attempt {i+1}")
                return
            assert response.status_code == 401, f"Expected 401 at attempt {i+1}, got {response.status_code}"
        
        # 6th attempt should be rate limited
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "username": VALID_USERNAME,
            "security_answer": "WrongAnswer",
            "new_password": "SomePassword123"
        })
        assert response.status_code == 429, f"Expected 429 after 5 attempts, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "too many" in data["detail"].lower() or "15 minutes" in data["detail"].lower()
        print(f"✓ Rate limiting correctly returns 429: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
