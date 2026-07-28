from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.transaction import Transaction

class CRUDTransaction:
    def create_transaction(self, db: Session, user_id: int, ticker: str, type: str, shares: float, price: float, realized_pl: float = 0.0) -> Transaction:
        db_tx = Transaction(
            user_id=user_id,
            ticker=ticker,
            type=type,
            shares=shares,
            price=price,
            realized_pl=realized_pl
        )
        db.add(db_tx)
        db.commit()
        db.refresh(db_tx)
        return db_tx

    def get_transactions_sum_realized_pl(self, db: Session, user_id: int) -> float:
        val = db.scalar(
            select(func.sum(Transaction.realized_pl)).where(Transaction.user_id == user_id)
        )
        return float(val) if val is not None else 0.0

    def get_transactions_history(self, db: Session, user_id: int) -> list[Transaction]:
        return list(db.scalars(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc())
        ).all())
