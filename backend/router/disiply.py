from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags=["disiply"]
)

@router.get("/show_portfolio")
def show_portfolio(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.show_portfolio(db, user_id)

@router.get("/portfolio_summary")
def portfolio_summary(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.portfolio_summary(db, user_id)

@router.get("/transaction_log")
def transaction_log(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.transaction_log_history(db, user_id)
