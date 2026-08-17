from sqlalchemy.orm import Session
from app.crud import crud_watchlist
from app.services.stock_service import get_prices_from_alpaca, get_batch_prices_from_alpaca
from app.schemas.watchlist import WatchlistAlertUpdate, WatchlistCreate


async def post_watchlist(db: Session, item: WatchlistCreate, user_id: int):
    ticker = item.ticker.upper().strip()
    prices = await get_prices_from_alpaca(ticker)
    if prices is None:
        return "The stock does not exist in the market", None
    try:
        crud_watchlist.create_watchlist_item(
            db=db, 
            user_id=user_id, 
            ticker=ticker,
            target_price=item.target_price,
            alert_direction=item.alert_direction
        )
        return "success"
    except Exception:
        return "Stock is already in your watchlist"

async def update_alert_service(db: Session, user_id: int, ticker: str, alert_data: WatchlistAlertUpdate):
    item = crud_watchlist.get_item_by_ticker(db, user_id, ticker)
    
    if not item:
        return {"error": "Item not found in watchlist"}
    
    item.target_price = alert_data.target_price
    item.alert_direction = alert_data.alert_direction
    item.alert_triggered = False 
    
    db.commit()
    return {"message": "Alert updated successfully"}


async def get_watchlist(db: Session, user_id: int): 
    items = crud_watchlist.get_watchlist(db, user_id)
    if not items:
        return []

    # 1. Extract all tickers and fetch all prices in a single batch call
    tickers = [item.ticker.upper() for item in items]
    prices_map = await get_batch_prices_from_alpaca(tickers)

    # 2. Build response in-memory instantaneously
    result = []
    for item in items:
        ticker = item.ticker.upper()
        prices = prices_map.get(ticker, {})
        last_price = prices.get("lastPrice")
        prev_close = prices.get("previousClose")
        volume = prices.get("volume")
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
            "change_percent": change_percent,
            "volume": volume,
            "target_price": item.target_price,
            "alert_direction": item.alert_direction,
            "alert_triggered": bool(item.alert_triggered) if item.alert_triggered is not None else False
        })
    return result
