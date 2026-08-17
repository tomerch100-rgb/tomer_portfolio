import logging
import asyncio
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.watchlist import Watchlist
from app.services.stock_service import get_batch_prices_from_alpaca
from app.services.telegram.telegram_notifier import send_telegram_alert

logger = logging.getLogger(__name__)

async def check_prices_and_alert():
    """
    Background worker job:
    1. Scans active alerts from the database.
    2. Batches price lookups using Alpaca/cache.
    3. Concurrently dispatches Telegram push notifications.
    4. Marks triggered alerts in a single DB commit.
    """
    logger.info("🔍 מתחיל סריקת מחירי מניות ברקע...")
    db: Session = SessionLocal()
    
    try:
        def _get_active_alerts():
            return db.scalars(
                select(Watchlist)
                .where(Watchlist.target_price.isnot(None))
                .where(Watchlist.alert_triggered == False)
            ).all()

        active_alerts = await asyncio.to_thread(_get_active_alerts)

        if not active_alerts:
            logger.info("ℹ️ אין התראות פעילות הממתינות לבדיקה.")
            return

        tickers = list(set([item.ticker.upper() for item in active_alerts if item.ticker]))
        logger.info(f"📊 סורק מחירים עבור {len(tickers)} מניות במקביל: {tickers}")
        
        # Batch resolve all live prices asynchronously
        prices_map = await get_batch_prices_from_alpaca(tickers)

        triggered_alerts = []
        alert_tasks = []

        for alert in active_alerts:
            ticker = alert.ticker.upper()
            price_info = prices_map.get(ticker)
            if not price_info or price_info.get("lastPrice") is None:
                continue

            current_price = Decimal(str(price_info["lastPrice"]))
            target = Decimal(str(alert.target_price))
            direction = alert.alert_direction

            is_hit = False
            if direction == "UP" and current_price >= target:
                is_hit = True
            elif direction == "DOWN" and current_price <= target:
                is_hit = True

            if is_hit:
                logger.info(f"🎯 פגיעה ביעד! {ticker} הגיעה ל-{current_price}$ (כיוון: {direction})")
                direction_text = "עלתה למחיר היעד" if direction == "UP" else "ירדה למחיר היעד"
                
                message = (
                    f"🚨 *התראת מחיר מניה - TomerVest*\n\n"
                    f"המניה *{ticker}* {direction_text} שלך!\n"
                    f"💰 מחיר נוכחי: `${current_price:.2f}`\n"
                    f"🎯 מחיר יעד מוגדר: `${target:.2f}`\n"
                    f"📈 כיוון: *{direction}*"
                )

                triggered_alerts.append(alert)
                alert_tasks.append(send_telegram_alert(db, alert.user_id, message))

        if alert_tasks:
            logger.info(f"🚀 שולח {len(alert_tasks)} התראות טלגרם במקביל...")
            results = await asyncio.gather(*alert_tasks, return_exceptions=True)

            for alert, res in zip(triggered_alerts, results):
                if res is True:
                    alert.alert_triggered = True

            def _commit():
                db.commit()

            await asyncio.to_thread(_commit)
            logger.info(f"✅ עודכנו {len(triggered_alerts)} התראות בהצלחה בבסיס הנתונים.")

    except Exception as e:
        logger.error(f"❌ שגיאה במהלך סריקת המניות: {e}", exc_info=True)
        def _rollback():
            db.rollback()
        await asyncio.to_thread(_rollback)
    finally:
        def _close():
            db.close()
        await asyncio.to_thread(_close)
        logger.info("🏁 סריקת המניות הסתיימה בהצלחה.")