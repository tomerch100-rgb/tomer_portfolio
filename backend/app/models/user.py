from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(60), nullable=False)
    telegram_id = Column(String(50), unique=True, nullable=True, index=True)
    
    
    portfolio = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    history = relationship("PortfolioHistory", back_populates="owner", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete-orphan")
    watchlist = relationship("Watchlist", back_populates="owner", cascade="all, delete-orphan")
