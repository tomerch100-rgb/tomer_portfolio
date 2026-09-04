from pydantic import BaseModel, ConfigDict

class StockBase(BaseModel):
    symbol: str
    name: str
    exchange: str | None = None

class StockCreate(StockBase):
    is_active: bool = True

class StockResponse(StockBase):
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
