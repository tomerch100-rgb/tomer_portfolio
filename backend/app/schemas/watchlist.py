from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WatchlistCreate(BaseModel):
    ticker: str
    target_price: float | None = None
    alert_direction: str | None = None


class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    ticker: str
    order_index: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WatchlistAlertUpdate(BaseModel):
    target_price: float | None = None
    alert_direction: str | None = None
