import requests

BASE_URL = "http://127.0.0.1:8000"

def test_register():
    url = f"{BASE_URL}/auth/register"
    data = {"username": "tomer_test", "password": "123", "email": "tomer@test.com"}
    response = requests.post(url, json=data)
    print(f"Register Status: {response.status_code}")
    print(f"Register Response: {response.json()}")

def test_login():
    url = f"{BASE_URL}/auth/login"
    data = {"username": "tomer_test", "password": "123", "email": "tomer@test.com"}
    response = requests.post(url, json=data)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response: {response.json()}")

if __name__ == "__main__":
    print("--- Testing Registration ---")
    test_register()
    print("\n--- Testing Login ---")
    test_login()