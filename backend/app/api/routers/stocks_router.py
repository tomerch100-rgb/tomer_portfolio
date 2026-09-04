from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.crud_stocks import get_stock_by_symbol, search_stocks
from app.db.session import get_db
from app.models.stocks import Stock
from app.schemas.stocks_api import StockResponse
from app.services.stocks_api_sync import fetch_and_sync_stocks

router = APIRouter(prefix="/stocks", tags=["stocks"])


@router.post("/sync", status_code=status.HTTP_200_OK)
async def sync_stocks(db: Session = Depends(get_db)):
    """
    משיכת כל שמות וסימולי המניות ממאגר ה-SEC וסנכרון שלהם ב-Database.
    """
    try:
        total_synced = await fetch_and_sync_stocks(db=db)
        return {
            "status": "success",
            "message": f"Stocks synchronized successfully. Total updated/inserted: {total_synced}",
            "synced_stocks": total_synced,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synchronize stocks from SEC: {str(e)}",
        )


@router.get("/search", response_model=list[StockResponse])
def search_stocks_endpoint(
    q: str = Query(..., min_length=1, description="חיפוש לפי סימול מניה או שם חברה"),
    limit: int = Query(10, ge=1, le=100, description="כמות תוצאות מקסימלית"),
    db: Session = Depends(get_db),
):
    """
    חיפוש מניות להשלמה אוטומטית (Autocomplete) לפי סימול או שם החברה.
    """
    return search_stocks(db=db, query=q, limit=limit)


@router.get("/{symbol}", response_model=StockResponse)
def get_stock_by_symbol_endpoint(
    symbol: str,
    db: Session = Depends(get_db),
):
    """
    שליפת פרטי מניה בודדת לפי הסימול שלה (למשל: AAPL).
    """
    stock = get_stock_by_symbol(db=db, symbol=symbol)
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock '{symbol.upper()}' not found",
        )
    return stock


@router.get("", response_model=list[StockResponse])
def list_stocks(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    שליפת רשימת מניות פעילות עם חלוקה לעמודים (Pagination).
    """
    stmt = (
        select(Stock)
        .where(Stock.is_active.is_(True))
        .order_by(Stock.symbol.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
