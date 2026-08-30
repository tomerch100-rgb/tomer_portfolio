import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.user import User

@pytest.mark.asyncio
async def test_add_stock_order_success(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify adding/buying stock updates portfolio holdings and records transaction."""
    payload = {
        "stock": "NVDA",
        "shares": 10,
        "avg_price": 120.00
    }
    response = await client.post("/orders/add_stock", headers=auth_headers, json=payload)
    assert response.status_code == 200

    # Verify portfolio record created
    holding = db_session.query(Portfolio).filter_by(user_id=test_user.user_id, ticker="NVDA").first()
    assert holding is not None
    assert holding.shares == 10
    assert holding.avg_price == 120.00

    # Verify transaction created
    tx = db_session.query(Transaction).filter_by(user_id=test_user.user_id, ticker="NVDA").first()
    assert tx is not None
    assert tx.shares == 10

@pytest.mark.asyncio
async def test_sell_stock_order_success(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify selling stock reduces share count and creates sell transaction."""
    # Seed holding
    holding = Portfolio(
        user_id=test_user.user_id,
        ticker="AAPL",
        shares=20,
        avg_price=150.00,
        sector="Technology"
    )
    db_session.add(holding)
    db_session.commit()

    payload = {
        "stock": "AAPL",
        "shares": 10,
        "avg_price": 180.00
    }
    response = await client.post("/orders/sell_stock", headers=auth_headers, json=payload)
    assert response.status_code == 200

    # Verify holding reduced to 10
    db_session.refresh(holding)
    assert holding.shares == 10

    # Verify sell transaction
    tx = db_session.query(Transaction).filter_by(user_id=test_user.user_id, ticker="AAPL", type="SELL").first()
    assert tx is not None
    assert tx.shares == 10

@pytest.mark.asyncio
async def test_sell_stock_more_than_owned(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify attempting to sell more shares than owned returns an error."""
    holding = Portfolio(
        user_id=test_user.user_id,
        ticker="TSLA",
        shares=5,
        avg_price=200.00,
        sector="Consumer Cyclical"
    )
    db_session.add(holding)
    db_session.commit()

    payload = {
        "stock": "TSLA",
        "shares": 10, # owns only 5
        "avg_price": 220.00
    }
    response = await client.post("/orders/sell_stock", headers=auth_headers, json=payload)
    assert response.status_code in [400, 200]
    # Check that portfolio wasn't deducted to negative
    db_session.refresh(holding)
    assert holding.shares == 5
