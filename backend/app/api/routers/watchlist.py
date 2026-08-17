from app.schemas.watchlist import WatchlistAlertUpdate
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
import app.services.portfolio as pf
from app.core import security
from app.services.stock_service import get_prices_from_alpaca
from app.schemas.watchlist import WatchlistCreate

router = APIRouter(
    tags=["watchlist"] , prefix= "/watchlist"
)

@router.post("/add_watchlist")
@router.post("")
async def add_watchlist(
    item: WatchlistCreate,  # עכשיו מקבלים JSON מסודר מהפרונטאנד!
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
): 
    return await pf.post_watchlist(db, item, user_id)


@router.put("/update_alert/{ticker}")
@router.put("/alert/{ticker}")
async def update_watchlist_alert(
    ticker: str,
    alert_data: WatchlistAlertUpdate,
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return await pf.update_alert_service(db, user_id, ticker, alert_data)

@router.get("/show_watchlist")
async def show_watchlist(
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return await pf.get_watchlist(db, user_id)


@router.get("/test-alpaca/{symbol}")
async def test_alpaca(symbol: str):
    prices = await get_prices_from_alpaca(symbol)
    if prices:
        return {"success": True, "lastPrice": prices.get("lastPrice"), "previousClose": prices.get("previousClose")}
    return {"success": False, "error": f"Failed to fetch data for {symbol}"}
