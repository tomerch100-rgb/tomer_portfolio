from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.crud import crud_transaction
from app.services.portfolio import portfolio_core_service

async def execute_stock_trade(db: Session, user_id: int, type: str, ticker: str, shares: float, price: float):
    type = type.upper()
    if type == "BUY":
        # Validation for BUY
        total_cost = shares * price
        available_cash = crud_transaction.get_available_cash(db, user_id)
        if available_cash < total_cost:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient cash balance for this buy order. Required: ${total_cost:,.2f}, Available: ${available_cash:,.2f}"
            )
        return await portfolio_core_service.add_stock(db, user_id, ticker, shares, price)
    elif type == "SELL":
        return portfolio_core_service.sell_stock(db, user_id, ticker, shares, price)
    else:
        raise HTTPException(status_code=400, detail="Invalid trade type. Must be BUY or SELL.")

def execute_cash_transaction(db: Session, user_id: int, type: str, cash_amount: float):
    type = type.upper()
    if type == "WITHDRAW":
        available_cash = crud_transaction.get_available_cash(db, user_id)
        if cash_amount > available_cash:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient funds for withdrawal. Requested: ${cash_amount:,.2f}, Available: ${available_cash:,.2f}"
            )
    elif type != "DEPOSIT":
        raise HTTPException(status_code=400, detail="Invalid cash transaction type. Must be DEPOSIT or WITHDRAW.")
    
    return crud_transaction.create_cash_transaction(db, user_id, type, cash_amount)

def get_cash_summary(db: Session, user_id: int):
    available_cash = crud_transaction.get_available_cash(db, user_id)
    total_account_value = crud_transaction.total_account_value(db, user_id)
    realized_pl_total = crud_transaction.get_transactions_sum_realized_pl(db, user_id)
    
    realized_pl_percentage = 0.0
    if total_account_value > 0:
        cost_basis = total_account_value - realized_pl_total
        if cost_basis > 0:
            realized_pl_percentage = (realized_pl_total / cost_basis) * 100
            
    return {
        "available_cash": available_cash,
        "total_account_value": total_account_value,
        "realized_pl_total": realized_pl_total,
        "realized_pl_percentage": realized_pl_percentage
    }

def get_user_history(db: Session, user_id: int):
    return crud_transaction.get_transactions_history(db, user_id)

def transaction_log_history(db: Session, user_id: int):
    rows = crud_transaction.get_transactions_history(db, user_id)
    row_list = []
    for row in rows: 
        row_list.append({
            "ticker": row.ticker,
            "action_type": row.type,
            "shares": float(row.shares) if row.shares is not None else 0.0,
            "price": float(row.price) if row.price is not None else 0.0,
            "realized_pl": float(row.realized_pl),
            "transaction_date": str(row.transaction_date)
        })
    return row_list

