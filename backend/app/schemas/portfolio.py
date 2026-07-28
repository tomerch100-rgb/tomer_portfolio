from pydantic import BaseModel, ConfigDict
from datetime import date

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

class PortfolioHistoryCreate(BaseModel):
    total_value: float

class PortfolioHistoryResponse(BaseModel):
    id: int
    user_id: int
    total_value: float
    calculation_date: date

    model_config = ConfigDict(from_attributes=True)

# Legacy / Compatibility Helper Class
class Holding:
    def __init__(self, ticker: str, shares: float, avg_price: float):
        self.ticker = ticker
        self.shares = shares
        self.avg_price = avg_price
    
    def cost_basis(self) -> float:
        return float(self.shares) * float(self.avg_price)
        
    def calculate_realized_pl(self, sell_price: float, sell_shares: float) -> float:
        return (float(sell_price) - float(self.avg_price)) * float(sell_shares)
