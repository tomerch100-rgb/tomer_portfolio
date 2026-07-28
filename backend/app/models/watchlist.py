from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Watchlist(Base):
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    owner = relationship("User", back_populates="watchlist")
    
    __table_args__ = (UniqueConstraint("user_id", "ticker", name="_user_watchlist_uc"),)
