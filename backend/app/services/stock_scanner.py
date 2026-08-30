import asyncio
import logging
from decimal import Decimal

from app.core.ws_manager import manager
from app.db.session import SessionLocal
from app.models.portfolio import Portfolio
from app.models.watchlist import Watchlist
from app.services.stock_service import get_batch_prices_from_alpaca
from app.services.telegram.telegram_notifier import send_telegram_alert
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


async def check_prices_and_alert():
    """
    Background worker job (Runs every interval):
    1. Scans active Watchlist alerts and active Portfolio TP/SL thresholds from the database.
    2. Batches live price lookups using Alpaca/cache.
    3. Broadcasts live PRICE_UPDATE events over WebSocket to all connected clients.
    4. Evaluates Watchlist targets and dispatches ALERT_TRIGGERED events & Telegram push alerts.
    5. Evaluates Portfolio TP/SL thresholds and dispatches PORTFOLIO_ALERT_TRIGGERED events & Telegram alerts.
    6. Atomically marks triggered flags in database.
    """
    logger.info("🔍 מתחיל סריקת מחירי מניות והתראות תיק ברקע...")
    db: Session = SessionLocal()

    try:

        def _get_active_records():
            watchlist_alerts = db.scalars(
                select(Watchlist).where(Watchlist.target_price.isnot(None)).where(Watchlist.alert_triggered.is_(False))
            ).all()

            portfolio_alerts = db.scalars(
                select(Portfolio).where(
                    or_(
                        (Portfolio.take_profit.isnot(None)) & (Portfolio.tp_triggered.is_(False)),
                        (Portfolio.stop_loss.isnot(None)) & (Portfolio.sl_triggered.is_(False)),
                    )
                )
            ).all()

            return list(watchlist_alerts), list(portfolio_alerts)

        active_watchlist, active_portfolio = await asyncio.to_thread(_get_active_records)

        # Collect unique tickers to scan
        watchlist_tickers = [item.ticker.upper() for item in active_watchlist if item.ticker]
        portfolio_tickers = [pos.ticker.upper() for pos in active_portfolio if pos.ticker]
        all_tickers = list(set(watchlist_tickers + portfolio_tickers))

        if not all_tickers:
            logger.info("ℹ️ אין מניות עם התראות פעילות הממתינות לבדיקה.")
            return

        logger.info(f"📊 סורק מחירים עבור {len(all_tickers)} מניות במקביל: {all_tickers}")

        # 1. Batch resolve all live prices asynchronously
        prices_map = await get_batch_prices_from_alpaca(all_tickers)
        if not prices_map:
            logger.warning("⚠️ לא התקבלו מחירי מניות מספק הנתונים.")
            return

        # 2. Broadcast live PRICE_UPDATE stream to all active WebSocket clients
        price_broadcast_tasks = []
        for ticker, p_data in prices_map.items():
            if isinstance(p_data, dict) and p_data.get("lastPrice") is not None:
                lp = float(p_data["lastPrice"])
                prev_close = float(p_data.get("previousClose") or lp)
                chg = lp - prev_close
                chg_pct = (chg / prev_close * 100) if prev_close != 0 else 0.0

                price_broadcast_tasks.append(
                    manager.broadcast(
                        {
                            "type": "PRICE_UPDATE",
                            "symbol": ticker,
                            "ticker": ticker,
                            "price": round(lp, 2),
                            "change": round(chg, 2),
                            "change_percent": round(chg_pct, 2),
                        }
                    )
                )

        if price_broadcast_tasks:
            await asyncio.gather(*price_broadcast_tasks, return_exceptions=True)

        triggered_watchlist = []
        triggered_portfolio_tp = []
        triggered_portfolio_sl = []
        alert_tasks = []
        ws_tasks = []

        # 3. Evaluate Watchlist Target Alerts
        for alert in active_watchlist:
            ticker = alert.ticker.upper()
            price_info = prices_map.get(ticker)
            if not price_info or price_info.get("lastPrice") is None:
                continue

            current_price = Decimal(str(price_info["lastPrice"]))
            target = Decimal(str(alert.target_price))
            direction = alert.alert_direction

            is_hit = False
            if (direction in ("UP", "ABOVE") and current_price >= target) or (
                direction in ("DOWN", "BELOW") and current_price <= target
            ):
                is_hit = True

            if is_hit:
                logger.info(f"🎯 פגיעה ביעד Watchlist! {ticker} הגיעה ל-{current_price}$ (כיוון: {direction})")
                direction_text = "עלתה למחיר היעד" if direction == "UP" else "ירדה למחיר היעד"

                message = (
                    f"🚨 *התראת מחיר מניה - TomerVest*\n\n"
                    f"המניה *{ticker}* {direction_text} שלך!\n"
                    f"💰 מחיר נוכחי: `${current_price:.2f}`\n"
                    f"🎯 מחיר יעד מוגדר: `${target:.2f}`\n"
                    f"📈 כיוון: *{direction}*"
                )

                triggered_watchlist.append(alert)
                alert_tasks.append(send_telegram_alert(db, alert.user_id, message))

                # Harmonized ALERT_TRIGGERED event payload
                ws_payload = {
                    "type": "ALERT_TRIGGERED",
                    "ticker": ticker,
                    "symbol": ticker,
                    "price": float(current_price),
                    "target": float(target),
                    "direction": direction,
                    "message": f"המניה {ticker} {direction_text} ({current_price:.2f}$)!",
                    "payload": {
                        "ticker": ticker,
                        "symbol": ticker,
                        "price": float(current_price),
                        "target_price": float(target),
                        "direction": direction,
                        "message": f"המניה {ticker} {direction_text} ({current_price:.2f}$)!",
                    },
                }
                ws_tasks.append(manager.send_personal_message(ws_payload, alert.user_id))

        # 4. Evaluate Portfolio Take Profit & Stop Loss Alerts
        for pos in active_portfolio:
            ticker = pos.ticker.upper()
            price_info = prices_map.get(ticker)
            if not price_info or price_info.get("lastPrice") is None:
                continue

            current_price = Decimal(str(price_info["lastPrice"]))
            avg_price = Decimal(str(pos.avg_price))
            shares = Decimal(str(pos.shares))
            current_worth = current_price * shares
            cost_basis = avg_price * shares
            p_l_amount = float(current_worth - cost_basis)
            p_l_pct = float((current_worth - cost_basis) / cost_basis * 100) if cost_basis != 0 else 0.0

            # Take Profit Check
            if pos.take_profit is not None and not pos.tp_triggered:
                tp_val = Decimal(str(pos.take_profit))
                if current_price >= tp_val:
                    logger.info(f"🚀 Take Profit פגע ביעד עבור {ticker}! מחיר: {current_price}$, יעד: {tp_val}$")
                    triggered_portfolio_tp.append(pos)

                    tg_msg = (
                        f"🎯 *התראת יעד רווח (Take Profit) - TomerVest*\n\n"
                        f"פוזיציית *{ticker}* הגיעה ליעד הרווח!\n"
                        f"💰 מחיר נוכחי: `${current_price:.2f}`\n"
                        f"🎯 יעד TP שהוגדר: `${tp_val:.2f}`\n"
                        f"📊 רווח פוזיציה: `${p_l_amount:.2f}` ({p_l_pct:+.2f}%)"
                    )
                    alert_tasks.append(send_telegram_alert(db, pos.user_id, tg_msg))

                    ws_tp_payload = {
                        "type": "PORTFOLIO_ALERT_TRIGGERED",
                        "payload": {
                            "ticker": ticker,
                            "symbol": ticker,
                            "alert_type": "TAKE_PROFIT",
                            "current_price": float(current_price),
                            "threshold_price": float(tp_val),
                            "p_l_amount": p_l_amount,
                            "p_l_percent": p_l_pct,
                            "message": f"התראת Take Profit! פוזיציית {ticker} הגיעה ל-${float(current_price):.2f}",
                        },
                    }
                    ws_tasks.append(manager.send_personal_message(ws_tp_payload, pos.user_id))

            # Stop Loss Check
            if pos.stop_loss is not None and not pos.sl_triggered:
                sl_val = Decimal(str(pos.stop_loss))
                if current_price <= sl_val:
                    logger.info(f"🛑 Stop Loss הופעל עבור {ticker}! מחיר: {current_price}$, חסימה: {sl_val}$")
                    triggered_portfolio_sl.append(pos)

                    tg_msg = (
                        f"⚠️ *התראת הגבלת הפסד (Stop Loss) - TomerVest*\n\n"
                        f"פוזיציית *{ticker}* ירדה לרף ה-Stop Loss!\n"
                        f"💰 מחיר נוכחי: `${current_price:.2f}`\n"
                        f"🛑 מחיר SL מוגדר: `${sl_val:.2f}`\n"
                        f"📉 הפסד פוזיציה: `${p_l_amount:.2f}` ({p_l_pct:+.2f}%)"
                    )
                    alert_tasks.append(send_telegram_alert(db, pos.user_id, tg_msg))

                    ws_sl_payload = {
                        "type": "PORTFOLIO_ALERT_TRIGGERED",
                        "payload": {
                            "ticker": ticker,
                            "symbol": ticker,
                            "alert_type": "STOP_LOSS",
                            "current_price": float(current_price),
                            "threshold_price": float(sl_val),
                            "p_l_amount": p_l_amount,
                            "p_l_percent": p_l_pct,
                            "message": f"התראת Stop Loss! פוזיציית {ticker} ירדה ל-${float(current_price):.2f}",
                        },
                    }
                    ws_tasks.append(manager.send_personal_message(ws_sl_payload, pos.user_id))

        # 5. Dispatch Telegram notifications and WebSocket pushes concurrently
        if alert_tasks or ws_tasks:
            logger.info(f"🚀 שולח {len(alert_tasks)} התראות טלגרם ו-{len(ws_tasks)} הודעות WS...")
            results = await asyncio.gather(*alert_tasks, return_exceptions=True)
            if ws_tasks:
                await asyncio.gather(*ws_tasks, return_exceptions=True)

            # Mark Watchlist alerts as triggered
            for alert, res in zip(triggered_watchlist, results[: len(triggered_watchlist)]):
                if res is True:
                    alert.alert_triggered = True

            # Mark Portfolio TP/SL alerts as triggered
            for pos in triggered_portfolio_tp:
                pos.tp_triggered = True
            for pos in triggered_portfolio_sl:
                pos.sl_triggered = True

            def _commit():
                db.commit()

            await asyncio.to_thread(_commit)
            logger.info(
                f"✅ עודכנו {len(triggered_watchlist)} התראות Watchlist ו-{len(triggered_portfolio_tp) + len(triggered_portfolio_sl)} התראות Portfolio במסד הנתונים."
            )

    except Exception as e:
        logger.exception(f"❌ שגיאה במהלך סריקת המניות: {e}")

        def _rollback():
            db.rollback()

        await asyncio.to_thread(_rollback)
    finally:

        def _close():
            db.close()

        await asyncio.to_thread(_close)
        logger.info("🏁 סריקת המניות וההתראות הסתיימה בהצלחה.")
