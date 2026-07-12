from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal

# User Schemas
class User_register(BaseModel):
    username: str
    password: str
    email: EmailStr

class User_login(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    username: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True)

# Portfolio/Stock Schemas
class Stock_info(BaseModel):
    stock: str
    shares: float
    avg_price: float

class PortfolioBase(BaseModel):
    ticker: str
    shares: float
    avg_price: float
    sector: str

class PortfolioCreate(PortfolioBase):
    user_id: int

class PortfolioResponse(PortfolioBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True)

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    ticker: str

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    ticker: str
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Transaction Schemas
class TransactionCreate(BaseModel):
    ticker: str
    type: str # 'BUY' or 'SELL'
    shares: float
    price: float
    realized_pl: Optional[float] = 0.0

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    ticker: str
    type: str
    shares: float
    price: float
    transaction_date: datetime
    realized_pl: float

    model_config = ConfigDict(from_attributes=True)

# History Schemas
class PortfolioHistoryCreate(BaseModel):
    total_value: float

class PortfolioHistoryResponse(BaseModel):
    id: int
    user_id: int
    total_value: float
    calculation_date: date

    model_config = ConfigDict(from_attributes=True)

# Legacy / Compatibility Classes
class Holding:
    def __init__(self, ticker: str, shares: float, avg_price: float):
        self.ticker = ticker
        self.shares = shares
        self.avg_price = avg_price
    
    def cost_basis(self) -> float:
        return float(self.shares) * float(self.avg_price)
        
    def calculate_realized_pl(self, sell_price: float, sell_shares: float) -> float:
        return (float(sell_price) - float(self.avg_price)) * float(sell_shares)

class transition_log:
    def __init__(self, ticker: str, action_type: str, shares: float, price: float, realized_pl: float, transaction_date: datetime):
        self.ticker = ticker
        self.action_type = action_type
        self.shares = shares
        self.price = price
        self.realized_pl = realized_pl
        self.transaction_date = transaction_date
