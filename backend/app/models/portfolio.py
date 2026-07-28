from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Portfolio(Base):
    __tablename__ = "portfolio"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    shares = Column(Numeric(10, 4), nullable=False)
    avg_price = Column(Numeric(10, 2), nullable=False)
    sector = Column(String(50), nullable=False)
    
    owner = relationship("User", back_populates="portfolio")
    
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="_user_ticker_uc"),)


class PortfolioHistory(Base):
    __tablename__ = "portfolio_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    total_value = Column(Numeric(12, 2), nullable=False)
    calculation_date = Column(Date, server_default=func.current_date(), nullable=False)
    
    owner = relationship("User", back_populates="history")
