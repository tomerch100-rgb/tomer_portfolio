from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.watchlist import Watchlist
from typing import Optional
from decimal import Decimal 


class CRUDWatchlist:
    def create_watchlist_item(
    self, 
    db: Session, 
    user_id: int, 
    ticker: str,
    target_price: Optional[Decimal] = None,   
    alert_direction: Optional[str] = None 
    ) -> Watchlist:

        max_idx = db.scalar(
            select(func.max(Watchlist.order_index)).where(Watchlist.user_id == user_id)
        )
        next_idx = (max_idx + 1) if max_idx is not None else 0

        db_item = Watchlist(
            user_id=user_id, 
            ticker=ticker.upper(), 
            order_index=next_idx,
            target_price=target_price,
            alert_direction=alert_direction
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    def get_watchlist(self, db: Session, user_id: int) -> list[Watchlist]:
        return list(db.scalars(
            select(Watchlist)
            .where(Watchlist.user_id == user_id)
            .order_by(Watchlist.order_index.asc())
        ).all())

    def get_item_by_ticker(self, db: Session, user_id: int, ticker: str) -> Watchlist | None:
        return db.scalar(
            select(Watchlist)
            .where(Watchlist.user_id == user_id, Watchlist.ticker == ticker.upper())
        ) 

crud_watchlist = CRUDWatchlist()