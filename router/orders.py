from fastapi import APIRouter, Depends
import security
from pydantic import BaseModel
import portfolio_function as pf
router = APIRouter()

class Stock_info (BaseModel):
    stock : str
    shares : float
    avg_price : float

@router.post("/add_stock")
def add_stock (stock_info:Stock_info ,user_id = Depends (security.get_current_user_id) ):
    return pf.add_stock(user_id,stock_info.stock,stock_info.shares,stock_info.avg_price )

@router.post ("/sell_stock") 
def sell_stock (stock_info:Stock_info, user_id = Depends (security.get_current_user_id)) :
    return pf.sell_stock (user_id,stock_info.stock,stock_info.shares,stock_info.avg_price )

