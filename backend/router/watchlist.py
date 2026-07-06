from fastapi import APIRouter,Depends
import connectors.portfolio_function as pf
from core import security
router = APIRouter(
    tags= ["watchlist"]
)



@router.post ("/add_watchlist")
def add_watchlist ( stock : str,user_id = Depends (security.get_current_user_id)) : 
    return pf.post_watchlist(stock,user_id)

@router.get ("/show_watchlist" )
def show_watchlist ( user_id = Depends  (security.get_current_user_id)):
    return pf.get_watchlist(user_id)


