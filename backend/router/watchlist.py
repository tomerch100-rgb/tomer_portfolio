from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.database import get_db
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags=["watchlist"]
)

@router.post("/add_watchlist")
def add_watchlist(
    stock: str, 
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
): 
    return pf.post_watchlist(db, stock, user_id)

@router.get("/show_watchlist")
def show_watchlist(
    user_id = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.get_watchlist(db, user_id)
