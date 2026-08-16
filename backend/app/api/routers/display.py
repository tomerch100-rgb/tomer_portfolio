from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
import app.services.portfolio as pf
from app.core import security
from app.crud import crud_portfolio

router = APIRouter(
    tags=["display"] , prefix= "/display"
)

from pydantic import BaseModel
from typing import Optional

class UpdatePositionRequest(BaseModel):
    ticker: str
    risk_level: Optional[str] = None
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None

@router.patch("/update_position")
def update_position(
    data: UpdatePositionRequest,
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    updated = crud_portfolio.update_position_analysis(
        db, user_id, data.ticker.upper(), data.risk_level, data.take_profit, data.stop_loss
    )
    if updated:
        return {"status": "success", "message": "Position updated successfully."}
    return {"status": "error", "message": "Position not found."}

@router.get("/show_portfolio")
async def show_portfolio(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return await pf.show_portfolio(db, user_id)

@router.get("/portfolio_summary")
async def portfolio_summary(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return await pf.portfolio_summary(db, user_id)

@router.get("/transaction_log")
def transaction_log(
    user_id: int = Depends(security.get_current_user_id), 
    db: Session = Depends(get_db)
):
    return pf.transaction_log_history(db, user_id)
