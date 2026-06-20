from fastapi import APIRouter,Depends
import connectors.portfolio_function as pf
import security

router = APIRouter()

@router.get ("/show_portfolio")
def show_portfolio (user_id : int = Depends (security.get_current_user_id)) :
    return pf.show_portfolio (user_id)

@router.get ("/portfolio_summary")
def portfolio_summary (user_id : int = Depends (security.get_current_user_id)) :
    return pf.portfolio_summary (user_id)

@router.get ("/transaction_log")
def transaction_log (user_id : int =  Depends (security.get_current_user_id)) :
    return pf.transaction_log_history (user_id)
