import logging
from datetime import datetime

from aiogram.types import Update
from app.core.security import get_current_user_id
from app.crud.crud_user import crud_user
from app.db.session import get_db
from app.services.telegram.telegram_notifier import send_telegram_alert
from app.services.telegram.telegram_service import bot, dp
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    logger.info("🟢 Webhook entry point: Received update from Telegram")
    try:
        update_json = await request.json()
        logger.info(f"📬 Webhook payload: {update_json}")

        update = Update(**update_json)
        logger.info(
            f"🔍 Parsed Update ID: {update.update_id}, Type: {update.event_type if hasattr(update, 'event_type') else 'Message/Other'}"
        )

        # Forwarding the update and the active DB session to the dispatcher
        logger.info("🚀 Feeding update to Dispatcher...")
        await dp.feed_update(bot, update, db=db)
        logger.info("✅ Update successfully processed by Dispatcher")

    except Exception as e:
        logger.exception(f"❌ Error in webhook endpoint: {e}")
        # We still return status ok so Telegram doesn't keep retrying failed updates repeatedly
        return {"status": "error", "detail": str(e)}

    return {"status": "ok"}


@router.post("/test-alert")
async def test_telegram_alert(current_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """
    Sends an immediate test alert to the authenticated user's linked Telegram chat.
    """
    user = crud_user.get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="משתמש לא נמצא במערכת")

    if not user.telegram_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="לא נמצא חשבון טלגרם מקושר. אנא חבר את חשבון הטלגרם שלך תחילה.",
        )

    time_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    test_message = (
        f"🔔 *בדיקת התראות TomerVest*\n\n"
        f"שלום *{user.username}*! 🚀\n"
        f"חשבון הטלגרם שלך מחובר בהצלחה למערכת ומקבל התראות מחיר בזמן אמת.\n\n"
        f"⏰ זמן בדיקה: `{time_str}`"
    )

    success = await send_telegram_alert(db, current_user_id, test_message)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="שליחת הודעת הבדיקה לטלגרם נכשלה. אנא ודא שהתחלת שיחה עם הבוט בטלגרם.",
        )

    return {"status": "success", "message": f"התראת בדיקה נשלחה בהצלחה לחשבון הטלגרם (ID: {user.telegram_id})!"}
