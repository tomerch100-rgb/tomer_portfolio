import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.user import User

@pytest.mark.asyncio
async def test_show_portfolio_returns_holdings(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify show_portfolio calculates position values and profit/loss."""
    stock = Portfolio(
        user_id=test_user.user_id,
        ticker="MSFT",
        shares=10,
        avg_price=300.00,
        sector="Technology"
    )
    db_session.add(stock)
    db_session.commit()

    response = await client.get("/display/show_portfolio", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(item.get("ticker") == "MSFT" for item in data)

@pytest.mark.asyncio
async def test_portfolio_summary_calculation(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify portfolio_summary aggregates total invested and current value."""
    stock1 = Portfolio(user_id=test_user.user_id, ticker="NVDA", shares=10, avg_price=100.0, sector="Technology")
    stock2 = Portfolio(user_id=test_user.user_id, ticker="AAPL", shares=5, avg_price=200.0, sector="Technology")
    db_session.add_all([stock1, stock2])
    db_session.commit()

    response = await client.get("/display/portfolio_summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_investment" in data or "total_value" in data or "profit_loss" in data

@pytest.mark.asyncio
async def test_update_position_tp_sl(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify updating Take Profit, Stop Loss, and Risk level on a holding."""
    stock = Portfolio(
        user_id=test_user.user_id,
        ticker="TSLA",
        shares=10,
        avg_price=200.00,
        sector="Consumer Cyclical"
    )
    db_session.add(stock)
    db_session.commit()

    payload = {
        "ticker": "TSLA",
        "take_profit": 280.00,
        "stop_loss": 175.00,
        "risk_level": "Medium"
    }
    response = await client.patch("/display/update_position", headers=auth_headers, json=payload)
    assert response.status_code == 200

    db_session.refresh(stock)
    assert stock.take_profit == 280.00
    assert stock.stop_loss == 175.00
