from pydantic import BaseModel, ConfigDict
from datetime import datetime

class WatchlistCreate(BaseModel):
    ticker: str

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    ticker: str
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
