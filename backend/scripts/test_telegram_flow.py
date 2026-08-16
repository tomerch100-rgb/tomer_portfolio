import sys
import os
import requests
import logging

# Configure sys.path so we can import app modules directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.core import security
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("telegram_test")

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

def get_test_user(db):
    return db.scalars(select(User).where(User.username == "test_telegram_qa_user")).first()

def setup_test_user():
    db = SessionLocal()
    try:
        user = get_test_user(db)
        if user:
            logger.info("🗑️ Existing test user found. Deleting it to ensure clean state...")
            db.delete(user)
            db.commit()
            
        logger.info("➕ Creating new test user...")
        hashed_password = security.hash_password("testpass")
        new_user = User(
            username="test_telegram_qa_user",
            email="test_telegram_qa_user@example.com",
            password_hash=hashed_password,
            telegram_id=None,
            telegram_connect_token=None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"✅ Created test user with ID: {new_user.user_id}")
        return new_user.user_id
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to setup test user: {e}")
        raise e
    finally:
        db.close()

def cleanup_test_user():
    db = SessionLocal()
    try:
        user = get_test_user(db)
        if user:
            logger.info("🧹 Cleaning up: Deleting test user...")
            db.delete(user)
            db.commit()
            logger.info("✅ Cleanup completed successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to clean up test user: {e}")
    finally:
        db.close()

def run_tests():
    logger.info("🚀 Starting E2E Telegram Link Integration Tests...")
    
    # 1. Setup User
    setup_test_user()
    
    # 2. Login to get JWT Token
    logger.info("🔑 Step 1: Logging in to get access token...")
    login_payload = {
        "username": "test_telegram_qa_user",
        "password": "testpass"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if response.status_code != 200:
        logger.error(f"❌ Login failed with status {response.status_code}: {response.text}")
        return False
        
    login_data = response.json()
    access_token = login_data.get("access_token")
    if not access_token:
        logger.error("❌ Access token missing from login response.")
        return False
    logger.info("✅ Successfully logged in and received access token.")
    
    # 3. Generate Link Token
    logger.info("🔗 Step 2: Generating Telegram link token...")
    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.post(f"{BASE_URL}/api/link/telegram/generate-telegram-token", headers=headers)
    if response.status_code != 200:
        logger.error(f"❌ Generate link token failed with status {response.status_code}: {response.text}")
        return False
        
    token_data = response.json()
    telegram_url = token_data.get("telegram_url")
    if not telegram_url:
        logger.error("❌ telegram_url missing from response.")
        return False
        
    logger.info(f"✅ Token URL generated: {telegram_url}")
    
    # Extract token
    token = telegram_url.split("start=")[-1]
    logger.info(f"🔑 Extracted token: {token}")
    
    # Verify in DB
    db = SessionLocal()
    try:
        user = get_test_user(db)
        if user.telegram_connect_token != token:
            logger.error(f"❌ Token mismatch in DB! Expected {token}, found {user.telegram_connect_token}")
            return False
        logger.info("✅ Database check passed: Token successfully stored in user record.")
    finally:
        db.close()
        
    # 4. Trigger Webhook with start command
    logger.info("📬 Step 3: Simulating Telegram Webhook /start <token>...")
    webhook_payload = {
        "update_id": 99999,
        "message": {
            "message_id": 999,
            "from": {
                "id": 987654321,
                "is_bot": False,
                "first_name": "QA_Tester",
                "username": "qa_tester"
            },
            "chat": {
                "id": 987654321,
                "type": "private",
                "first_name": "QA_Tester"
            },
            "date": 1600000000,
            "text": f"/start {token}"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/telegram/webhook", json=webhook_payload)
    if response.status_code != 200:
        logger.error(f"❌ Webhook request failed with status {response.status_code}")
        return False
        
    # Note: Since chat ID 987654321 is mock, the bot's call to message.answer will fail with "chat not found",
    # which is captured and returned in the detail. However, the DB should be committed BEFORE message.answer!
    res_json = response.json()
    logger.info(f"ℹ️ Webhook response: {res_json}")
    
    # Verify in DB that linking took place
    db = SessionLocal()
    try:
        user = get_test_user(db)
        if user.telegram_id != "987654321":
            logger.error(f"❌ DB linking failed: user.telegram_id is {user.telegram_id}, expected '987654321'")
            return False
        if user.telegram_connect_token is not None:
            logger.error(f"❌ DB linking failed: user.telegram_connect_token is still {user.telegram_connect_token}, expected None")
            return False
        logger.info("✅ Database check passed: User is successfully linked (Telegram ID stored, connect token cleared).")
    finally:
        db.close()
        
    # 5. Test Edge Case: Invalid Token
    logger.info("🛑 Step 4: Testing edge case: Webhook with invalid token...")
    invalid_payload = {
        "update_id": 100000,
        "message": {
            "message_id": 1000,
            "from": {"id": 111111, "is_bot": False, "first_name": "QA"},
            "chat": {"id": 111111, "type": "private"},
            "date": 1600000000,
            "text": "/start fake_token_123"
        }
    }
    response = requests.post(f"{BASE_URL}/api/telegram/webhook", json=invalid_payload)
    logger.info(f"ℹ️ Webhook response for invalid token: {response.json()}")
    
    # Verify DB remains unchanged (Telegram ID is still 987654321)
    db = SessionLocal()
    try:
        user = get_test_user(db)
        if user.telegram_id != "987654321":
            logger.error("❌ Edge case failed: User Telegram ID changed on invalid token start command!")
            return False
        logger.info("✅ Edge case passed: Database unchanged on invalid token start command.")
    finally:
        db.close()

    # 6. Test Edge Case: Start with no token
    logger.info("🛑 Step 5: Testing edge case: Webhook with no token...")
    no_token_payload = {
        "update_id": 100001,
        "message": {
            "message_id": 1001,
            "from": {"id": 222222, "is_bot": False, "first_name": "QA"},
            "chat": {"id": 222222, "type": "private"},
            "date": 1600000000,
            "text": "/start"
        }
    }
    response = requests.post(f"{BASE_URL}/api/telegram/webhook", json=no_token_payload)
    logger.info(f"ℹ️ Webhook response for no token start: {response.json()}")
    
    logger.info("🎉 All integration tests passed successfully!")
    return True

if __name__ == "__main__":
    success = False
    try:
        success = run_tests()
    except Exception as e:
        logger.error(f"Test runner encountered unhandled error: {e}", exc_info=True)
    finally:
        cleanup_test_user()
        
    if success:
        sys.exit(0)
    else:
        sys.exit(1)
