import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.watchlist import Watchlist


@pytest.mark.asyncio
async def test_add_watchlist_item_success(
    client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session
):
    """Verify adding stock to watchlist creates watchlist item."""
    payload = {"ticker": "NVDA", "target_price": 140.00, "alert_direction": "ABOVE"}
    response = await client.post("/watchlist/add_watchlist", headers=auth_headers, json=payload)
    assert response.status_code == 200

    # Verify item in DB
    item = db_session.query(Watchlist).filter_by(user_id=test_user.user_id, ticker="NVDA").first()
    assert item is not None
    assert item.ticker == "NVDA"


@pytest.mark.asyncio
async def test_show_watchlist_items(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify show_watchlist returns items with enriched market quotes."""
    item = Watchlist(user_id=test_user.user_id, ticker="AAPL", target_price=230.00, alert_direction="ABOVE")
    db_session.add(item)
    db_session.commit()

    response = await client.get("/watchlist/show_watchlist", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(w.get("ticker") == "AAPL" for w in data)


@pytest.mark.asyncio
async def test_update_watchlist_alert_target(
    client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session
):
    """Verify updating alert price and direction on watchlist item."""
    item = Watchlist(user_id=test_user.user_id, ticker="TSLA", target_price=200.00, alert_direction="BELOW")
    db_session.add(item)
    db_session.commit()

    update_payload = {"target_price": 250.00, "alert_direction": "ABOVE"}
    response = await client.put("/watchlist/update_alert/TSLA", headers=auth_headers, json=update_payload)
    assert response.status_code == 200

    db_session.refresh(item)
    assert item.target_price == 250.00
    assert item.alert_direction == "ABOVE"
