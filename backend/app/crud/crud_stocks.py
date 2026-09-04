from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from app.models.stocks import Stock
from app.schemas.stocks_api import StockCreate


def search_stocks(db: Session, query: str, limit: int = 10) -> list[Stock]:
    """
    חיפוש מניות להשלמה אוטומטית.
    מחפש האם המחרוזת מופיעה בסימול (AAPL) או בשם החברה (Apple),
    ומחזיר רק מניות פעילות.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    search_pattern = f"%{clean_query}%"

    stmt = (
        select(Stock)
        .where(
            Stock.is_active.is_(True),
            or_(
                Stock.symbol.ilike(search_pattern),
                Stock.name.ilike(search_pattern),
            ),
        )
        .order_by(
            Stock.symbol.ilike(f"{clean_query}%").desc(),
            Stock.symbol.asc(),
        )
        .limit(limit)
    )

    return list(db.scalars(stmt).all())


def get_stock_by_symbol(db: Session, symbol: str) -> Stock | None:
    """
    שליפת מניה בודדת לפי הסימול שלה (למשל לצורך בדיקות או דף מניה).
    """
    stmt = select(Stock).where(Stock.symbol == symbol.upper().strip())
    return db.scalars(stmt).first()


def bulk_upsert_stocks(db: Session, stocks_data: list[StockCreate]) -> int:
    """
    הכנסה או עדכון של רשימת מניות גדולה בפקודה אחת (Upsert).
    אם הסימול קיים - מעדכן את השם והבורסה. אם לא - יוצר רשומה חדשה.
    """
    if not stocks_data:
        return 0

    records = [stock.model_dump() for stock in stocks_data]

    dialect_name = db.bind.dialect.name if db.bind else "postgresql"
    if dialect_name == "sqlite":
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert

        stmt = sqlite_insert(Stock).values(records)
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=[Stock.symbol],
            set_={
                "name": stmt.excluded.name,
                "exchange": stmt.excluded.exchange,
                "is_active": stmt.excluded.is_active,
            },
        )
        db.execute(upsert_stmt)
    else:
        stmt = insert(Stock).values(records)
        # במידה והסימול כבר קיים ב-DB, מעדכנים את הפרטים הקיימים במקום לזרוק שגיאת Duplicate
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=[Stock.symbol],
            set_={
                "name": stmt.excluded.name,
                "exchange": stmt.excluded.exchange,
                "is_active": stmt.excluded.is_active,
            },
        )
        db.execute(upsert_stmt)

    db.commit()
    return len(records)
