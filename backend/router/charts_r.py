from fastapi import APIRouter,Depends 
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags= ["charts"]
)

@router.get("/portfolio_history")
def portfolio_history(user_id : int = Depends (security.get_current_user_id)):
    return pf.get_portfolio_history(user_id)

@router.get("/daily_change")
def daily_change ( user_id : int = Depends (security.get_current_user_id)) :
    return pf.get_daily_change(user_id)

@router.get("/portfolio_pie")
def portfolio_pie (user_id : int  = Depends (security.get_current_user_id)) :
    return pf.get_protfolio_pie (user_id)







