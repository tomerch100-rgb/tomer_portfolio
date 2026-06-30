from sqlalchemy import Column, Integer, String, DateTime,Date, ForeignKey,Numeric,Time,ARRAY,Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base



class User(Base):
    """Core user model for authentication and identity management."""
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(20), unique=True, nullable=False)
    username = Column(String(15), unique=True, nullable=False)
    password_hash = Column(String(32), nullable=False)
    portfolio = relationship("Portfolio", back_populates="owner")
    

class   Portfolio (Base) :
    __tablename__ = "portfolio"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer,ForeignKey("users.user_id"),nullable=False)
    ticker = Column (String(12),nullable=False)
    shares = Column (Float,nullable=False)
    avg_price = Column(Float ,nullable=False , )
    sector = Column (String ,nullable=False  )
    owner = relationship("User", back_populates="portfolio")



class Portfolio_history (Base) :
    __tablename__ = portfolio_history
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer,ForeignKey("users.user_id"))
    total_value = Column (Float,nullable=False )
    calculation_date = Column (Date,nullable=False )

class whatchlist




