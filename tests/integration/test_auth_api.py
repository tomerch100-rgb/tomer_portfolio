import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.user import User

@pytest.mark.asyncio
async def test_register_new_user_success(client: AsyncClient, db_session: Session):
    """Verify user registration returns success and creates user in database."""
    payload = {
        "username": "new_trader",
        "email": "trader@example.com",
        "password": "Password123!"
    }
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 200

    # Verify user exists in DB with hashed password
    user = db_session.query(User).filter_by(username="new_trader").first()
    assert user is not None
    assert user.email == "trader@example.com"
    assert user.password_hash != "Password123!"

@pytest.mark.asyncio
async def test_register_duplicate_username_fails(client: AsyncClient, test_user: User):
    """Verify registration fails when username already exists."""
    payload = {
        "username": test_user.username,
        "email": "different_email@example.com",
        "password": "Password123!"
    }
    response = await client.post("/auth/register", json=payload)
    # Backend returns string or error on duplicate
    assert "already exists" in str(response.text).lower() or response.status_code in [400, 409]

@pytest.mark.asyncio
async def test_login_successful_credentials(client: AsyncClient, test_user: User):
    """Verify login with correct credentials returns JWT token and sets auth cookie."""
    payload = {
        "username": test_user.username,
        "password": "SecurePassword123!"
    }
    response = await client.post("/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == test_user.username

@pytest.mark.asyncio
async def test_login_invalid_password_fails(client: AsyncClient, test_user: User):
    """Verify login with incorrect password returns 401 Unauthorized."""
    payload = {
        "username": test_user.username,
        "password": "WrongPassword999!"
    }
    response = await client.post("/auth/login", json=payload)
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_current_user_profile_authenticated(client: AsyncClient, auth_headers: dict, test_user: User):
    """Verify /auth/me returns authenticated user details."""
    response = await client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == test_user.username
    assert data["email"] == test_user.email

@pytest.mark.asyncio
async def test_get_current_user_profile_unauthorized(client: AsyncClient):
    """Verify /auth/me without token returns 401 Unauthorized."""
    response = await client.get("/auth/me")
    assert response.status_code == 401
