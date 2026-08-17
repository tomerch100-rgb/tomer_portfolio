import logging
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User 
from .telegram_service import bot

logger = logging.getLogger(__name__)

async def send_telegram_alert(db: Session, user_id: int, message: str) -> bool:
    """
    Sends a proactive Telegram notification to the user's linked Telegram chat.
    Looks up user.telegram_id using user.user_id.
    """
    try:
        logger.info(f"🔍 Looking up Telegram ID for user {user_id}...")
        user = db.scalars(select(User).where(User.user_id == user_id)).first()

        if not user or not user.telegram_id:
            logger.warning(f"⚠️ Cannot send alert: User {user_id} has no linked telegram_id.")
            return False

        await bot.send_message(chat_id=user.telegram_id, text=message, parse_mode="Markdown")
        
        logger.info(f"✅ Alert successfully sent to user {user_id} (Telegram ID: {user.telegram_id})")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to send Telegram alert to user {user_id}: {e}", exc_info=True)
        return False