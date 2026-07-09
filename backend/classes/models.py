from sqlalchemy import Column, Integer, String, Date, ForeignKey, Numeric, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base

class User(Base):
    """Core user model for authentication and identity management."""
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)  
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(60), nullable=False)     
    
    portfolio = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    portfolio_history = relationship("PortfolioHistory", back_populates="owner", cascade="all, delete-orphan")
    watchlist = relationship("Watchlist", back_populates="owner", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete-orphan")


class Portfolio(Base):
    __tablename__ = "portfolio"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False, index=True)
    shares = Column(Numeric(12, 4), nullable=False)      # Numeric תומך ברכישת שברי מניות מדויקים
    avg_price = Column(Numeric(10, 2), nullable=False)   # דיוק של 2 ספרות אחרי הנקודה לכסף
    sector = Column(String(50), nullable=True)          # שונה ל-nullable=True למקרה שה-API לא יחזיר סקטור מיד
    
    owner = relationship("User", back_populates="portfolio")


class PortfolioHistory(Base):
    __tablename__ = "portfolio_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    total_value = Column(Numeric(12, 2), nullable=False)
    calculation_date = Column(Date, server_default=func.current_date())  # Neon יכניס את התאריך אוטומטית
    
    owner = relationship("User", back_populates="portfolio_history")


class Watchlist(Base):
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    created_at = Column(DateTime, server_default=func.now())  # כולל שעה מדויקת של הוספה לרשימה
    
    owner = relationship("User", back_populates="watchlist")


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False, index=True)
    type = Column(String(4), nullable=False)             # BUY או SELL
    shares = Column(Numeric(12, 4), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    transaction_date = Column(DateTime, server_default=func.now()) # חוסך ממך לשלוח תאריך מהפרונטנד
    realized_pl = Column(Numeric(10, 2), default=0.00)   # רווח/הפסד ממומש מהעסקה
    
    owner = relationship("User", back_populates="transactions")