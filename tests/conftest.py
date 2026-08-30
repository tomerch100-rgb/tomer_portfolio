import os
import sys
from collections.abc import Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

# 1. Force Test Environment Configuration before importing app modules
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-jwt-signing-1234567890"
os.environ["ALPACA_API_KEY"] = "test_alpaca_key"
os.environ["ALPACA_SECRET_KEY"] = "test_alpaca_secret"
os.environ["GEMINI_API_KEY"] = "test_gemini_key"
os.environ["GROQ_API_KEY"] = "test_groq_key"
os.environ["OPENROUTER_API_KEY"] = "test_openrouter_key"
os.environ["TELEGRAM_BOT_TOKEN"] = "test_bot_token"

# Ensure backend directory is in sys.path
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app

from app.core.security import create_access_token, hash_password
from app.db.base_class import Base
from app.db.session import get_db
from app.models.user import User

# 2. In-Memory SQLite Database Engine
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all DB tables once for the test session and tear down at the end."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a transactional DB session with automatic rollback between tests."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[AsyncClient, None, None]:
    """FastAPI AsyncClient overriding get_db to point to the isolated SQLite memory DB."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    yield AsyncClient(transport=transport, base_url="http://test")

    app.dependency_overrides.clear()


@pytest.fixture
def sync_client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI synchronous TestClient for WebSocket and sync endpoint testing."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a verified test user in the database."""
    user = User(
        username="test_investor", email="investor@tomervest.com", password_hash=hash_password("SecurePassword123!")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Generate valid JWT Authorization headers for the test user."""
    token = create_access_token({"sub": str(test_user.user_id), "username": test_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_token(test_user: User) -> str:
    """Generate raw JWT token string for the test user."""
    return create_access_token({"sub": str(test_user.user_id), "username": test_user.username})


@pytest.fixture(autouse=True)
def mock_redis_cache(monkeypatch):
    """In-memory Redis cache mock to eliminate Redis dependency during tests."""
    in_memory_store = {}

    async def mock_get(key: str):
        return in_memory_store.get(key)

    async def mock_set(key: str, value, expiration: int = 300):
        in_memory_store[key] = value
        return True

    monkeypatch.setattr("app.services.cache_service.get_cached_data", mock_get)
    monkeypatch.setattr("app.services.cache_service.set_cached_data", mock_set)
    return in_memory_store


@pytest.fixture(autouse=True)
def mock_external_stock_services(monkeypatch):
    """Mock Alpaca and Yahoo Finance external calls to ensure zero network dependency."""

    async def mock_get_prices_from_alpaca(ticker: str):
        return {"lastPrice": 150.00, "previousClose": 145.00, "volume": 50000000}

    async def mock_get_batch_prices_from_alpaca(tickers: list[str]):
        return {t.upper(): {"lastPrice": 150.00, "previousClose": 145.00, "volume": 50000000} for t in tickers}

    async def mock_get_analysis_data(ticker: str):
        return {
            "company_name": f"{ticker.upper()} Inc.",
            "marketCap": 2500000000000,
            "trailingPE": 32.5,
            "forwardPE": 28.0,
            "pegRatio": 1.5,
            "priceToBook": 8.2,
            "fiftyTwoWeekLow": 120.0,
            "fiftyTwoWeekHigh": 180.0,
            "recommendationKey": "buy",
            "totalRevenue": 90000000000,
            "profitMargins": 0.25,
            "sector": "Technology",
        }

    monkeypatch.setattr("app.services.stock_service.get_prices_from_alpaca", mock_get_prices_from_alpaca)
    monkeypatch.setattr("app.services.stock_service.get_batch_prices_from_alpaca", mock_get_batch_prices_from_alpaca)
    monkeypatch.setattr("app.services.stock_service.get_analysis_data", mock_get_analysis_data)
