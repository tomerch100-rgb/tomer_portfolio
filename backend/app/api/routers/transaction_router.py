from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core import security
from app.db.session import get_db
from app.schemas.transaction import (
    TradeTransactionCreate, 
    CashTransactionCreate, 
    TransactionResponse, 
    TransactionSummaryResponse
)
from app.services import transaction_service

router = APIRouter(
    tags=["transactions"], prefix="/transactions"
)

@router.post("/trade")
async def execute_trade(
    trade: TradeTransactionCreate,
    user_id: int = Depends(security.get_current_user_id),
    db: Session = Depends(get_db)
):
    return await transaction_service.execute_stock_trade(
        db, user_id, trade.type, trade.ticker, trade.shares, trade.price
    )

@router.post("/cash")
def execute_cash(
    cash: CashTransactionCreate,
    user_id: int = Depends(security.get_current_user_id),
    db: Session = Depends(get_db)
):
    return transaction_service.execute_cash_transaction(
        db, user_id, cash.type, cash.cash_amount
    )

@router.get("/summary", response_model=TransactionSummaryResponse)
def get_summary(
    user_id: int = Depends(security.get_current_user_id),
    db: Session = Depends(get_db)
):
    return transaction_service.get_cash_summary(db, user_id)

@router.get("/history", response_model=List[TransactionResponse])
def get_history(
    user_id: int = Depends(security.get_current_user_id),
    db: Session = Depends(get_db)
):
    return transaction_service.get_user_history(db, user_id)
