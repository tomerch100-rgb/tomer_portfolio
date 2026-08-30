from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.user import User
from app.services.portfolio import (
    portfolio_analytics_service,
    portfolio_chart_service,
)


@pytest.mark.asyncio
async def test_stock_analysis_success():
    """Verify stock_analysis returns formatted metrics string."""
    mock_analysis = {
        "marketCap": 3000000000000,
        "trailingPE": 35.5,
        "recommendationKey": "buy",
    }
    with patch(
        "app.services.portfolio.portfolio_analytics_service.get_analysis_data",
        new=AsyncMock(return_value=mock_analysis),
    ):
        result = await portfolio_analytics_service.stock_analysis("AAPL")
        assert "AAPL" in result
        assert "35.5" in result


@pytest.mark.asyncio
async def test_stock_details_success():
    """Verify get_stock_details enriches analysis and price data."""
    mock_analysis = {
        "company_name": "Apple Inc.",
        "marketCap": 3000000000000,
        "trailingPE": 35.5,
        "recommendationKey": "buy",
    }
    mock_price = {"lastPrice": 230.0, "previousClose": 225.0}

    with (
        patch(
            "app.services.portfolio.portfolio_analytics_service.get_analysis_data",
            new=AsyncMock(return_value=mock_analysis),
        ),
        patch(
            "app.services.portfolio.portfolio_analytics_service.get_prices_from_alpaca",
            new=AsyncMock(return_value=mock_price),
        ),
    ):
        details = await portfolio_analytics_service.get_stock_details("AAPL")
        assert details["ticker"] == "AAPL"
        assert details["current_price"] == 230.0
        assert details["change"] == 5.0


@pytest.mark.asyncio
async def test_portfolio_chart_services(db_session: Session, test_user: User):
    """Verify portfolio pie and daily change calculations."""
    holding = Portfolio(
        user_id=test_user.user_id,
        ticker="MSFT",
        shares=10,
        avg_price=300.0,
        sector="Technology",
    )
    db_session.add(holding)
    db_session.commit()

    with patch(
        "app.services.portfolio.helpers_stock.update_prices",
        new=AsyncMock(return_value={"stock_currnet_worth": 3500.0, "day_change": 50.0}),
    ):
        pie = await portfolio_chart_service.get_protfolio_pie(db_session, test_user.user_id)
        assert len(pie) == 1
        assert pie[0]["ticker"] == "MSFT"

        daily = await portfolio_chart_service.get_daily_change(db_session, test_user.user_id)
        assert len(daily) == 1
        assert daily[0]["color"] == "green"

        history = portfolio_chart_service.get_portfolio_history(db_session, test_user.user_id)
        assert "date_times" in history
        assert "portfolio_value" in history
