import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.user import User

@pytest.mark.asyncio
async def test_generate_telegram_token_creates_deep_link(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify generating Telegram token saves unique token on user and returns deep link."""
    response = await client.post("/api/link/telegram/generate-telegram-token", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "telegram_url" in data
    assert "t.me" in data["telegram_url"]

    # Verify user record updated in DB
    db_session.refresh(test_user)
    assert test_user.telegram_connect_token is not None

@pytest.mark.asyncio
async def test_telegram_test_alert_without_linked_chat_fails(client: AsyncClient, auth_headers: dict, test_user: User):
    """Verify triggering test alert fails if user has no linked Telegram chat."""
    test_user.telegram_id = None
    response = await client.post("/api/telegram/test-alert", headers=auth_headers)
    assert response.status_code == 400
    assert "לא נמצא חשבון טלגרם" in response.json().get("detail", "")
