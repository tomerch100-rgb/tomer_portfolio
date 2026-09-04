from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session

from app.crud.crud_stocks import bulk_upsert_stocks, get_stock_by_symbol, search_stocks
from app.schemas.stocks_api import StockCreate
from app.services.stocks_api_sync import fetch_and_sync_stocks


def test_crud_stocks_lifecycle(db_session: Session):
    """בדיקת פעולות ה-CRUD של המניות (הכנסה, חיפוש, שליפה בודדת)"""
    test_stocks = [
        StockCreate(symbol="AAPL", name="Apple Inc.", exchange="Nasdaq"),
        StockCreate(symbol="MSFT", name="Microsoft Corporation", exchange="Nasdaq"),
        StockCreate(symbol="GOOGL", name="Alphabet Inc.", exchange="Nasdaq"),
    ]

    # 1. הכנסת מניות ב-Bulk
    inserted_count = bulk_upsert_stocks(db=db_session, stocks_data=test_stocks)
    assert inserted_count == 3

    # 2. חיפוש מניה לפי סימול או שם
    search_aapl = search_stocks(db=db_session, query="apple")
    assert len(search_aapl) == 1
    assert search_aapl[0].symbol == "AAPL"

    search_prefix = search_stocks(db=db_session, query="ms")
    assert len(search_prefix) >= 1
    assert any(s.symbol == "MSFT" for s in search_prefix)

    # 3. שליפה לפי סימול בודד
    stock = get_stock_by_symbol(db=db_session, symbol="googl")
    assert stock is not None
    assert stock.symbol == "GOOGL"
    assert stock.name == "Alphabet Inc."

    # 4. בדיקת מניה לא קיימת
    not_found = get_stock_by_symbol(db=db_session, symbol="UNKNOWN_TICKER")
    assert not_found is None

    # 5. חיפוש מחרוזת ריקה
    empty_search = search_stocks(db=db_session, query="")
    assert empty_search == []


@pytest.mark.asyncio
async def test_stocks_api_endpoints(client: AsyncClient, db_session: Session):
    """בדיקת נקודות הקצה של ה-API בראוטר /stocks"""
    # הזנת נתונים ראשונית ל-DB
    test_stocks = [
        StockCreate(symbol="TSLA", name="Tesla, Inc.", exchange="Nasdaq"),
        StockCreate(symbol="NVDA", name="NVIDIA Corporation", exchange="Nasdaq"),
    ]
    bulk_upsert_stocks(db=db_session, stocks_data=test_stocks)

    # 1. בדיקת GET /stocks/search
    res_search = await client.get("/stocks/search?q=tes")
    assert res_search.status_code == 200
    data = res_search.json()
    assert len(data) == 1
    assert data[0]["symbol"] == "TSLA"
    assert data[0]["name"] == "Tesla, Inc."

    # 2. בדיקת GET /stocks/{symbol} - קיים
    res_get = await client.get("/stocks/NVDA")
    assert res_get.status_code == 200
    stock_data = res_get.json()
    assert stock_data["symbol"] == "NVDA"
    assert stock_data["name"] == "NVIDIA Corporation"

    # 3. בדיקת GET /stocks/{symbol} - לא קיים (404)
    res_404 = await client.get("/stocks/NONEXISTENT")
    assert res_404.status_code == 404

    # 4. בדיקת GET /stocks (Pagination)
    res_list = await client.get("/stocks?limit=10&offset=0")
    assert res_list.status_code == 200
    stocks_list = res_list.json()
    assert len(stocks_list) >= 2


@pytest.mark.asyncio
async def test_stocks_sync_endpoint(client: AsyncClient):
    """בדיקת מסלול הסנכרון /stocks/sync עם מוק לשירות החיצוני"""
    with patch("app.api.routers.stocks_router.fetch_and_sync_stocks", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = 150

        response = await client.post("/stocks/sync")
        assert response.status_code == 200
        json_resp = response.json()
        assert json_resp["status"] == "success"
        assert json_resp["synced_stocks"] == 150


@pytest.mark.asyncio
async def test_stocks_sync_endpoint_error_handling(client: AsyncClient):
    """בדיקת טיפול בשגיאות במסלול /stocks/sync בעת כשל"""
    with patch("app.api.routers.stocks_router.fetch_and_sync_stocks", new_callable=AsyncMock) as mock_sync:
        mock_sync.side_effect = RuntimeError("SEC API Unavailable")

        response = await client.post("/stocks/sync")
        assert response.status_code == 500
        assert "Failed to synchronize stocks" in response.json()["detail"]


@pytest.mark.asyncio
async def test_fetch_and_sync_stocks_service(db_session: Session):
    """בדיקת שירות הסנכרון מול ה-SEC באמצעות מוק של ה-HTTP response"""
    mock_sec_json = {
        "fields": ["cik", "name", "ticker", "exchange"],
        "data": [
            [320193, "Apple Inc.", "AAPL", "Nasdaq"],
            [789019, "Microsoft Corp", "MSFT", "Nasdaq"],
            [1018724, "Amazon.com Inc.", "AMZN", "Nasdaq"],
        ],
    }

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = mock_sec_json
    mock_response.raise_for_status.return_value = None

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        synced_count = await fetch_and_sync_stocks(db=db_session)
        assert synced_count == 3

        # אימות שהמניות נשמרו ב-DB
        stock = get_stock_by_symbol(db=db_session, symbol="AMZN")
        assert stock is not None
        assert stock.name == "Amazon.com Inc."
