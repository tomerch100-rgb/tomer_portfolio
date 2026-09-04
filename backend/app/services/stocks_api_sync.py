import httpx
from sqlalchemy.orm import Session

from app.crud.crud_stocks import bulk_upsert_stocks
from app.schemas.stocks_api import StockCreate

# ה-URL הרשמי של רשות ניירות הערך האמריקאית (SEC)
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json"

SEC_HEADERS = {
    "User-Agent": "MyStockApp contact@mystockapp.com",
    "Accept-Encoding": "gzip, deflate",
}


async def fetch_and_sync_stocks(db: Session) -> int:
    """
    1. מושך את רשימת כל המניות הנסחרות בארה"ב מה-SEC.
    2. מפרק את המבנה שלהם לסכמות StockCreate.
    3. שומר או מעדכן ב-DB באמצעות ה-CRUD.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(SEC_TICKERS_URL, headers=SEC_HEADERS)
        response.raise_for_status()
        raw_data = response.json()


    fields = raw_data.get("fields", [])
    ticker_idx = fields.index("ticker")
    name_idx = fields.index("name")
    exchange_idx = fields.index("exchange")

    stocks_to_insert = []
    seen_symbols = set()

    for item in raw_data.get("data", []):
        raw_symbol = str(item[ticker_idx]).strip().upper()
        name = str(item[name_idx]).strip()
        exchange = str(item[exchange_idx]).strip() if item[exchange_idx] else None

        if not raw_symbol or raw_symbol in seen_symbols:
            continue

        seen_symbols.add(raw_symbol)

        stocks_to_insert.append(
            StockCreate(
                symbol=raw_symbol,
                name=name,
                exchange=exchange,
                is_active=True,
            )
        )

    batch_size = 2000
    total_synced = 0

    for i in range(0, len(stocks_to_insert), batch_size):
        batch = stocks_to_insert[i : i + batch_size]
        total_synced += bulk_upsert_stocks(db=db, stocks_data=batch)

    return total_synced
