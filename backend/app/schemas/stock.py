from pydantic import BaseModel

class StockInfo(BaseModel):
    stock: str
    shares: float
    avg_price: float
