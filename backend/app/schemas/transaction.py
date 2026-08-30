from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TransactionCreate(BaseModel):
    ticker: str
    type: str  # 'BUY' or 'SELL'
    shares: float
    price: float
    realized_pl: float | None = 0.0


class TradeTransactionCreate(BaseModel):
    ticker: str
    type: str  # 'BUY' or 'SELL'
    shares: float
    price: float


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    ticker: str | None = None
    type: str
    shares: float | None = None
    price: float | None = None
    transaction_date: datetime
    realized_pl: float | None = 0.0
    cashflow: float | None = 0.0

    model_config = ConfigDict(from_attributes=True)


class CashTransactionCreate(BaseModel):
    type: str  # 'DEPOSIT' or 'WITHDRAW'
    cash_amount: float


class TransactionSummaryResponse(BaseModel):
    available_cash: float
    total_account_value: float
    realized_pl_total: float
    realized_pl_percentage: float


class TransactionLog:
    def __init__(
        self, ticker: str, action_type: str, shares: float, price: float, realized_pl: float, transaction_date: datetime
    ):
        self.ticker = ticker
        self.action_type = action_type
        self.shares = shares
        self.price = price
        self.realized_pl = realized_pl
        self.transaction_date = transaction_date
