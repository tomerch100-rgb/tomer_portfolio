from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core import security 
from app.schemas import StockInfo
from app.db.session import get_db
import app.services.portfolio as pf

router = APIRouter(
    tags=["orders"]  , prefix= "/orders"
)

@router.post("/add_stock")
async def add_stock(
    stock_info: StockInfo, 
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return await pf.add_stock(db, user_id, stock_info.stock, stock_info.shares, stock_info.avg_price)

@router.post("/sell_stock") 
def sell_stock(
    stock_info: StockInfo, 
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.sell_stock(db, user_id, stock_info.stock, stock_info.shares, stock_info.avg_price)
