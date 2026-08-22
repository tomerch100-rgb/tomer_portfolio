from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Literal
from enum import Enum

class TargetFieldEnum(str, Enum):
    TICKER = "ticker"
    SHARES = "shares"
    AVG_PRICE = "avg_price"
    SECTOR = "sector"
    TAKE_PROFIT = "take_profit"
    STOP_LOSS = "stop_loss"

class ColumnMappingSuggestion(BaseModel):
    mapping: dict[str, Optional[str]] = Field(
        ...,
        description="Mapping from user file column header to schema target field or None"
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    notes: Optional[str] = Field(
        default=None,
        description="Optional parsing explanation or notes from AI/rule mapper"
    )

class ImportPreviewResponse(BaseModel):
    filename: str
    columns: list[str]
    suggested_mapping: dict[str, Optional[str]]
    confidence: float
    notes: Optional[str] = None
    preview_rows: list[dict[str, Any]]
    total_rows: int
    session_token: Optional[str] = None
    warnings: list[str] = []

    model_config = ConfigDict(from_attributes=True)

class ImportConfirmRequest(BaseModel):
    mapping: dict[str, Optional[str]] = Field(
        ...,
        description="User-confirmed column mapping from file header to target field (ticker, shares, avg_price, sector, take_profit, stop_loss)"
    )
    rows: Optional[list[dict[str, Any]]] = Field(
        default=None,
        description="Optional full raw parsed rows from client"
    )
    session_token: Optional[str] = Field(
        default=None,
        description="Optional session token returned from preview endpoint to retrieve cached rows"
    )
    overwrite_existing: bool = Field(
        default=True,
        description="If true, overwrite existing ticker positions. If false, calculate weighted average position."
    )

class ImportItemResult(BaseModel):
    ticker: str
    shares: float
    avg_price: float
    sector: Optional[str] = None
    take_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    status: Literal["created", "updated", "failed", "skipped"]
    message: Optional[str] = None

class ImportResultResponse(BaseModel):
    success: bool
    total_processed: int
    imported_count: int
    updated_count: int
    failed_count: int
    errors: list[str] = []
    items: list[ImportItemResult] = []

    model_config = ConfigDict(from_attributes=True)
