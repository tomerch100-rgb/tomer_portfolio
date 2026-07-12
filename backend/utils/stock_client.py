import requests

BASE_URL = "http://127.0.0.1:8000"

def run_full_flow():
    # 1. הרשמה
    reg_data = {"username": "tomer", "password": "123", "email": "tomer@test.com"}
    reg = requests.post(f"{BASE_URL}/auth/register", json=reg_data)
    print(f"1. Register: {reg.status_code}")

    # 2. לוגין
    login = requests.post(f"{BASE_URL}/auth/login", json={"username": "tomer", "password": "123"})
    if login.status_code != 200:
        print(f"Login failed: {login.text}")
        return
    
    token = login.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print(f"2. Login: Success | Token: {token[:10]}...")

    # 3. הוספת מניה (עם avg_price כפי שהשרת דורש)
    stock_data = {"stock": "AAPL", "shares": 10, "avg_price": 150}
    add = requests.post(f"{BASE_URL}/orders/add_stock", headers=headers, json=stock_data)
    print(f"3. Add Stock: {add.status_code} | {add.json()}")

    # 4. Watchlist (עם הפרמטר ב-URL כפי שהשרת דורש)
    wl = requests.post(f"{BASE_URL}/watchlist/add_watchlist?stock=TSLA", headers=headers)
    print(f"4. Watchlist: {wl.status_code} | {wl.json()}")

    # 5. הצגת תיק
    port = requests.get(f"{BASE_URL}/dry_disiply/show_portfolio", headers=headers)
    print(f"5. Portfolio: {port.status_code} | {port.json()}")

if __name__ == "__main__":
    run_full_flow()