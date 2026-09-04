import asyncio
import logging
import sys

# ייבוא ה-Session של ה-DB והשירות שכתבנו קודם
from app.db import SessionLocal
from app.services.stocks_api_sync import fetch_and_sync_stocks

# הגדרת לוגים כדי שנוכל לראות פלט מסודר בשרת
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


async def run_sync():
    logger.info("Starting monthly US stocks synchronization...")
    db = SessionLocal()
    try:
        total_synced = await fetch_and_sync_stocks(db=db)
        logger.info(f"Sync finished successfully. Total stocks updated/inserted: {total_synced}")
    except Exception as e:
        logger.error(f"Error occurred during stock sync: {e}", exc_info=True)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run_sync())