import logging
from aiogram.types import Update 
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.orm import Session

from app.services.telegram.telegram_service import bot, dp
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(
   prefix="/api/telegram",  
   tags=["telegram"]
)

@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    logger.info("🟢 Webhook entry point: Received update from Telegram")
    try:
        update_json = await request.json()
        logger.info(f"📬 Webhook payload: {update_json}")
        
        update = Update(**update_json)
        logger.info(f"🔍 Parsed Update ID: {update.update_id}, Type: {update.event_type if hasattr(update, 'event_type') else 'Message/Other'}")
        
        # Forwarding the update and the active DB session to the dispatcher
        logger.info("🚀 Feeding update to Dispatcher...")
        await dp.feed_update(bot, update, db=db)
        logger.info("✅ Update successfully processed by Dispatcher")
        
    except Exception as e:
        logger.error(f"❌ Error in webhook endpoint: {e}", exc_info=True)
        # We still return status ok so Telegram doesn't keep retrying failed updates repeatedly
        return {"status": "error", "detail": str(e)}
        
    return {"status": "ok"}
