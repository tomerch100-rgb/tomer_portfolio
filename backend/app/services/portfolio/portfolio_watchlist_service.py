from sqlalchemy.orm import Session
from app.crud import crud_watchlist
from app.services.stock_service import get_prices_from_alpaca

async def post_watchlist(db: Session, stock: str, user_id: int):
    prices = await get_prices_from_alpaca(stock)
    if prices is None:
        return "The stock does not exist in the market", None
    try:
        crud_watchlist.create_watchlist_item(db, user_id, stock)
        return "success"
    except Exception:
        return "Stock is already in your watchlist"

async def get_watchlist(db: Session, user_id: int): 
    items = crud_watchlist.get_watchlist(db, user_id)
    result = []
    for item in items:
        ticker = item.ticker.upper()
        prices = await get_prices_from_alpaca(ticker)
        last_price = prices.get("lastPrice") if prices else None
        prev_close = prices.get("previousClose") if prices else None
        change = 0.0
        change_percent = 0.0
        if last_price is not None and prev_close is not None and prev_close != 0:
            change = last_price - prev_close
            change_percent = (change / prev_close) * 100
        result.append({
            "ticker": ticker,
            "current_price": last_price,
            "previous_close": prev_close,
            "change": change,
            "change_percent": change_percent
        })
    return result
