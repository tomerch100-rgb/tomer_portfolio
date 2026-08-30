from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.portfolio import Portfolio
from app.models.user import User
from app.models.watchlist import Watchlist
from app.services.stock_scanner import check_prices_and_alert


class NonClosingSession:
    """Wrapper around test Session to prevent db.close() from closing the test transaction."""

    def __init__(self, session: Session):
        self._session = session

    def close(self):
        pass

    def __getattr__(self, item):
        return getattr(self._session, item)


@pytest.mark.asyncio
async def test_stock_scanner_no_active_records(monkeypatch, db_session: Session):
    """Verify stock scanner runs cleanly with zero active alerts."""
    wrapper = NonClosingSession(db_session)
    monkeypatch.setattr("app.services.stock_scanner.SessionLocal", lambda: wrapper)
    await check_prices_and_alert()


@pytest.mark.asyncio
async def test_stock_scanner_triggers_tp_sl_and_watchlist_alerts(db_session: Session, test_user: User, monkeypatch):
    """Verify stock scanner detects triggered TP/SL and updates DB flags."""
    wrapper = NonClosingSession(db_session)
    monkeypatch.setattr("app.services.stock_scanner.SessionLocal", lambda: wrapper)

    # Add watchlist alert
    w_item = Watchlist(
        user_id=test_user.user_id,
        ticker="NVDA",
        target_price=130.0,
        alert_direction="ABOVE",
        alert_triggered=False,
    )
    # Add portfolio with TP
    p_item = Portfolio(
        user_id=test_user.user_id,
        ticker="NVDA",
        shares=10,
        avg_price=100.0,
        sector="Technology",
        take_profit=130.0,
        tp_triggered=False,
    )
    db_session.add(w_item)
    db_session.add(p_item)
    db_session.commit()

    # Mock batch prices
    mock_prices = {
        "NVDA": {
            "lastPrice": 140.0,
            "previousClose": 130.0,
            "change": 10.0,
            "changePercent": 7.69,
            "volume": 1000000,
        }
    }

    with (
        patch(
            "app.services.stock_scanner.get_batch_prices_from_alpaca",
            new=AsyncMock(return_value=mock_prices),
        ),
        patch(
            "app.services.stock_scanner.send_telegram_alert",
            new=AsyncMock(return_value=True),
        ),
    ):
        await check_prices_and_alert()

    updated_w = db_session.scalar(select(Watchlist).where(Watchlist.id == w_item.id))
    updated_p = db_session.scalar(select(Portfolio).where(Portfolio.id == p_item.id))

    assert updated_w is not None
    assert updated_p is not None
    assert updated_w.alert_triggered is True
    assert updated_p.tp_triggered is True
