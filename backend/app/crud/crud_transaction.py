from app.models.transaction import Transaction
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .crud_portfolio import CRUDPortfolio as CP


class CRUDTransaction:
    def create_transaction(
        self, db: Session, user_id: int, ticker: str, type: str, shares: float, price: float, realized_pl: float = 0.0
    ) -> Transaction:
        total_transaction_value = shares * price
        type = type.upper()
        if type == "BUY":
            cashing = -(total_transaction_value)
        elif type == "SELL":
            cashing = total_transaction_value
        else:
            cashing = 0.0
        new_stock_trade = Transaction(
            user_id=user_id,
            ticker=ticker,
            type=type,
            shares=shares,
            price=price,
            realized_pl=realized_pl,
            cashflow=cashing,
        )
        db.add(new_stock_trade)
        db.commit()
        db.refresh(new_stock_trade)
        return new_stock_trade

    def get_transactions_sum_realized_pl(self, db: Session, user_id: int) -> float:
        val = db.scalar(select(func.sum(Transaction.realized_pl)).where(Transaction.user_id == user_id))
        return float(val) if val is not None else 0.0

    def get_transactions_history(self, db: Session, user_id: int) -> list[Transaction]:
        return list(
            db.scalars(
                select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.transaction_date.desc())
            ).all()
        )

    def create_cash_transaction(self, db: Session, user_id: int, type: str, cash_amount: float):
        type = type.upper()
        if type == "WITHDRAW":
            cash_value = -(cash_amount)
        elif type == "DEPOSIT":
            cash_value = cash_amount

        else:
            raise ValueError("Invalid transaction type. Must be DEPOSIT or WITHDRAW")

        db_cash = Transaction(user_id=user_id, type=type, cashflow=cash_value)
        db.add(db_cash)
        db.commit()
        db.refresh(db_cash)
        return db_cash

    def get_available_cash(self, db: Session, user_id: int) -> float:
        total_cash = db.query(func.sum(Transaction.cashflow)).filter(Transaction.user_id == user_id).scalar()

        return total_cash or 0.0

    def total_account_value(self, db: Session, user_id: int) -> float:
        stock_total_value = CP().get_portfolio_total_value(db, user_id)
        total_available_cash = self.get_available_cash(db, user_id)
        # one the total avalibale return demical
        return float(stock_total_value or 0.0) + float(total_available_cash or 0.0)

    def process_buy_order(self, db, user_id, ticker, shares, price):
        total_cost = shares * price
        available_cash = self.get_available_cash(db, user_id)

        if available_cash < total_cost:
            raise HTTPException(
                status_code=400, detail=f"אין מספיק יתרת מזומן. נדרש: ${total_cost}, זמין: ${available_cash}"
            )
