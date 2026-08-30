from app.db.base_class import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(12), nullable=True)
    type = Column(String(10), nullable=False)  # 'BUY' or 'SELL'
    shares = Column(Numeric(10, 4), nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    transaction_date = Column(DateTime, server_default=func.now(), nullable=False)
    realized_pl = Column(Numeric(10, 2), default=0.00)
    cashflow = Column(Numeric(10, 2), default=0.00)

    owner = relationship("User", back_populates="transactions")
