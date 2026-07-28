from fastapi import APIRouter, Depends 
from sqlalchemy.orm import Session
from app.db.session import get_db
import app.services.portfolio_function as pf
from app.core import security

router = APIRouter(
    tags=["charts"] , prefix= "/charts"
)

@router.get("/portfolio_history")
def portfolio_history(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.get_portfolio_history(db, user_id)

@router.get("/daily_change")
def daily_change(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.get_daily_change(db, user_id)

@router.get("/portfolio_pie")
def portfolio_pie(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.get_protfolio_pie(db, user_id)
