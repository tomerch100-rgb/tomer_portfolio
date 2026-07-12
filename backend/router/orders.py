from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core import security 
from classes import schema as lc
from db.database import get_db
import connectors.portfolio_function as pf

router = APIRouter(
    tags=["orders"]
)

@router.post("/add_stock")
def add_stock(
    stock_info: lc.Stock_info, 
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.add_stock(db, user_id, stock_info.stock, stock_info.shares, stock_info.avg_price)

@router.post("/sell_stock") 
def sell_stock(
    stock_info: lc.Stock_info, 
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.sell_stock(db, user_id, stock_info.stock, stock_info.shares, stock_info.avg_price)
