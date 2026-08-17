from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class WatchlistCreate(BaseModel):
    ticker: str
    target_price: Optional[float] = None
    alert_direction: Optional[str] = None

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    ticker: str
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    
class WatchlistAlertUpdate(BaseModel):
    target_price: Optional[float] = None
    alert_direction: Optional[str] = None