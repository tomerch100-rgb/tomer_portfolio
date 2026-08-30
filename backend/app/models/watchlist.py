from app.db.base_class import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    target_price = Column(Float, nullable=True, default=None)
    alert_triggered = Column(Boolean, nullable=False, default=False, server_default="false")
    # בקובץ המודלים שלך
    alert_direction = Column(String(10), nullable=True)  # יכיל "UP" או "DOWN"
    owner = relationship("User", back_populates="watchlist")

    __table_args__ = (UniqueConstraint("user_id", "ticker", name="_user_watchlist_uc"),)
