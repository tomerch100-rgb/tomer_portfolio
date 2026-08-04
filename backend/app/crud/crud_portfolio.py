from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.portfolio import Portfolio, PortfolioHistory

class CRUDPortfolio:
    def get_portfolio_stock(self, db: Session, user_id: int, ticker: str) -> Portfolio:
        return db.scalars(
            select(Portfolio).where(Portfolio.user_id == user_id, Portfolio.ticker == ticker)
        ).first()

    def get_portfolio_all(self, db: Session, user_id: int) -> list[Portfolio]:
        return list(db.scalars(
            select(Portfolio).where(Portfolio.user_id == user_id)
        ).all())

    def insert_portfolio(self, db: Session, user_id: int, ticker: str, shares: float, avg_price: float, sector: str) -> Portfolio:
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

    def update_portfolio(self, db: Session, user_id: int, ticker: str, shares: float, avg_price: float) -> Portfolio:
        db_portfolio = self.get_portfolio_stock(db, user_id, ticker)
        if db_portfolio:
            db_portfolio.shares = shares
            db_portfolio.avg_price = avg_price
            db.commit()
            db.refresh(db_portfolio)
        return db_portfolio

    def update_position_analysis(self, db: Session, user_id: int, ticker: str, risk_level: str, take_profit: float, stop_loss: float) -> Portfolio:
        db_portfolio = self.get_portfolio_stock(db, user_id, ticker)
        if db_portfolio:
            db_portfolio.risk_level = risk_level
            db_portfolio.take_profit = take_profit
            db_portfolio.stop_loss = stop_loss
            db.commit()
            db.refresh(db_portfolio)
        return db_portfolio

    def delete_portfolio_stock(self, db: Session, user_id: int, ticker: str) -> bool:
        db_portfolio = self.get_portfolio_stock(db, user_id, ticker)
        if db_portfolio:
            db.delete(db_portfolio)
            db.commit()
            return True
        return False

    def get_portfolio_total_value(self, db: Session, user_id: int) -> float:
        val = db.scalar(
            select(func.coalesce(func.sum(Portfolio.shares * Portfolio.avg_price), 0))
            .where(Portfolio.user_id == user_id)
        )
        return float(val) if val is not None else 0.0

    def get_portfolio_positions_count(self, db: Session, user_id: int) -> int:
        return db.scalar(
            select(func.count()).select_from(Portfolio).where(Portfolio.user_id == user_id)
        ) or 0

    # History Operations
    def insert_portfolio_history(self, db: Session, user_id: int, total_value: float) -> PortfolioHistory:
        db_hist = PortfolioHistory(user_id=user_id, total_value=total_value)
        db.add(db_hist)
        db.commit()
        db.refresh(db_hist)
        return db_hist

    def get_portfolio_history(self, db: Session, user_id: int) -> list[PortfolioHistory]:
        return list(db.scalars(
            select(PortfolioHistory)
            .where(PortfolioHistory.user_id == user_id)
            .order_by(PortfolioHistory.calculation_date.asc())
        ).all())
