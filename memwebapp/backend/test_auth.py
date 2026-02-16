"""
Test script to verify Microsoft authentication is working
"""

import requests
import json

# Base URL for your API
BASE_URL = "http://localhost:8000"

def test_microsoft_authentication():
    """Test the Microsoft authentication flow"""
    
    print("Testing Microsoft Authentication System")
    print("="*50)
    
    # Test 1: Try to access /meetings/ without authentication
    print("Testing 1: Accessing /meetings/ without authentication...")
    try:
        response = requests.get(f"{BASE_URL}/meetings/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 401:
            print("✅ Authentication required - Good!")
        else:
            print("❌ Authentication not required - Bad!")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: Check Microsoft auth status
    print("Testing 2: Checking Microsoft authentication status...")
    try:
        response = requests.get(f"{BASE_URL}/auth/microsoft/status")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            status_data = response.json()
            print("✅ Microsoft auth status retrieved:")
            print(f"   - Configured: {status_data.get('configured')}")
            print(f"   - Tenant ID: {status_data.get('tenant_id')}")
            print(f"   - Environment: {status_data.get('environment')}")
        else:
            print(f"❌ Failed to get Microsoft auth status: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 3: Use test authentication endpoint
    print("Testing 3: Using test authentication endpoint...")
    try:
        test_data = {
            "email": "test@panscience.ai",
            "name": "Test User"
        }
        response = requests.post(f"{BASE_URL}/auth/microsoft/test-auth", json=test_data)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            auth_data = response.json()
            access_token = auth_data.get("access_token")
            print("✅ Test authentication successful!")
            print(f"Access Token: {access_token[:20]}...")
            print(f"User: {auth_data['user']['name']} ({auth_data['user']['email']})")
            
            # Test 4: Access /meetings/ with authentication
            print("\nTesting 4: Accessing /meetings/ with authentication...")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = requests.get(f"{BASE_URL}/meetings/", headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            if response.status_code == 200:
                print("✅ Authenticated access successful!")
            else:
                print(f"❌ Authenticated access failed: {response.text}")
                
        else:
            print(f"❌ Test authentication failed: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 5: Check current user endpoint (should fail without token)
    print("Testing 5: Checking current user without authentication...")
    try:
        response = requests.get(f"{BASE_URL}/auth/me")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 401:
            print("✅ Authentication required for /auth/me - Good!")
        else:
            print(f"❌ Unexpected response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    print("Microsoft Authentication Test Complete!")
    print("\nTo test with actual Microsoft authentication:")
    print("1. Open: http://localhost:8000/auth/microsoft/login")
    print("2. Complete Microsoft OAuth flow")
    print("3. Use the returned JWT token in Authorization header")
    print("4. Test protected endpoints like /meetings/")
    print("\nFor easy testing in Swagger UI:")
    print("1. Use: POST /auth/microsoft/test-auth")
    print("2. Copy the access_token from response")
    print("3. Use it in Swagger Authorize button")

if __name__ == "__main__":
    test_microsoft_authentication()
