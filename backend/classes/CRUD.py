from sqlalchemy.orm import Session
from sqlalchemy import select, func, delete
from classes import models
from classes.models import User, Portfolio, PortfolioHistory, Transaction, Watchlist

# --- User Operations ---

def get_user_by_username(db: Session, username: str) -> User:
    return db.scalars(select(User).where(User.username == username)).first()

def get_user_by_id(db: Session, user_id: int) -> User:
    return db.get(User, user_id)

def create_user(db: Session, username: str, email: str, password_hash: str) -> User:
    db_user = User(username=username, email=email, password_hash=password_hash)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Portfolio Operations ---

def get_portfolio_stock(db: Session, user_id: int, ticker: str) -> Portfolio:
    return db.scalars(
        select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.ticker == ticker)
    ).first()

def get_portfolio_all(db: Session, user_id: int) -> list[Portfolio]:
    return list(db.scalars(
        select(Portfolio).where(Portfolio.user_id == user_id)
    ).all())

def insert_portfolio(db: Session, user_id: int, ticker: str, shares: float, avg_price: float, sector: str) -> Portfolio:
    db_portfolio = Portfolio(
        user_id=user_id,
        ticker=ticker,
        shares=shares,
        avg_price=avg_price,
        sector=sector
    )
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    return db_portfolio

def update_portfolio(db: Session, user_id: int, ticker: str, shares: float, avg_price: float) -> Portfolio:
    db_portfolio = get_portfolio_stock(db, user_id, ticker)
    if db_portfolio:
        db_portfolio.shares = shares
        db_portfolio.avg_price = avg_price
        db.commit()
        db.refresh(db_portfolio)
    return db_portfolio

def delete_portfolio_stock(db: Session, user_id: int, ticker: str) -> bool:
    db_portfolio = get_portfolio_stock(db, user_id, ticker)
    if db_portfolio:
        db.delete(db_portfolio)
        db.commit()
        return True
    return False

def get_portfolio_total_value(db: Session, user_id: int) -> float:
    val = db.scalar(
        select(func.coalesce(func.sum(Portfolio.shares * Portfolio.avg_price), 0))
        .where(Portfolio.user_id == user_id)
    )
    return float(val) if val is not None else 0.0

def get_portfolio_positions_count(db: Session, user_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Portfolio).where(Portfolio.user_id == user_id)
    ) or 0

# --- Transaction Operations ---

def create_transaction(db: Session, user_id: int, ticker: str, type: str, shares: float, price: float, realized_pl: float = 0.0) -> Transaction:
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

def get_transactions_sum_realized_pl(db: Session, user_id: int) -> float:
    val = db.scalar(
        select(func.sum(Transaction.realized_pl)).where(Transaction.user_id == user_id)
    )
    return float(val) if val is not None else 0.0

def get_transactions_history(db: Session, user_id: int) -> list[Transaction]:
    return list(db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc())
    ).all())

# --- Portfolio History Operations ---

def insert_portfolio_history(db: Session, user_id: int, total_value: float) -> PortfolioHistory:
    db_hist = PortfolioHistory(user_id=user_id, total_value=total_value)
    db.add(db_hist)
    db.commit()
    db.refresh(db_hist)
    return db_hist

def get_portfolio_history(db: Session, user_id: int) -> list[PortfolioHistory]:
    return list(db.scalars(
        select(PortfolioHistory)
        .where(PortfolioHistory.user_id == user_id)
        .order_by(PortfolioHistory.calculation_date.asc())
    ).all())

# --- Watchlist Operations ---

def create_watchlist_item(db: Session, user_id: int, ticker: str) -> Watchlist:
    max_idx = db.scalar(
        select(func.max(Watchlist.order_index)).where(Watchlist.user_id == user_id)
    )
    next_idx = (max_idx + 1) if max_idx is not None else 0
    
    db_item = Watchlist(user_id=user_id, ticker=ticker.upper(), order_index=next_idx)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_watchlist(db: Session, user_id: int) -> list[Watchlist]:
    return list(db.scalars(
        select(Watchlist)
        .where(Watchlist.user_id == user_id)
        .order_by(Watchlist.order_index.asc())
    ).all())