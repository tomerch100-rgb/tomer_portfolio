from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

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

# Legacy / Compatibility Helper Class (Renamed from transition_log to follow PascalCase)
class TransactionLog:
    def __init__(self, ticker: str, action_type: str, shares: float, price: float, realized_pl: float, transaction_date: datetime):
        self.ticker = ticker
        self.action_type = action_type
        self.shares = shares
        self.price = price
        self.realized_pl = realized_pl
        self.transaction_date = transaction_date
