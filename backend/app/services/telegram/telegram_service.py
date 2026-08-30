import asyncio
import logging
import os
from datetime import datetime, UTC

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import Message as TelegramMessage
from app.core.ws_manager import manager
from app.db.session import SessionLocal
from app.models.user import User
from dotenv import load_dotenv
from sqlalchemy import select, update
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production") 
dp = Dispatcher()
bot_router = Router()
dp.include_router(bot_router)

bot = None
if ENVIRONMENT == "testing":
    logger.info("🧪 Testing mode detected: Telegram bot initialization skipped.")
else:
    if not TELEGRAM_TOKEN:
        raise ValueError("CRITICAL: TELEGRAM_TOKEN environment variable is not set")
    bot = Bot(token=TELEGRAM_TOKEN)


def sync_link_telegram_user(db: Session, token: str, telegram_id: str) -> tuple[str, str | None, int | None]:
    """
    Synchronously query, update, and commit user Telegram connection details.
    Runs inside a worker thread to keep the FastAPI asyncio event loop completely unblocked.
    Returns (status, username, user_id).
    """
    telegram_id_str = str(telegram_id)

    logger.info(f"⚙️ Running sync_link_telegram_user - Token: {token}, Telegram ID: {telegram_id_str}")

    try:
        user = db.scalars(select(User).where(User.telegram_connect_token == token)).first()

        if not user:
            logger.warning(f"⚠️ Token not found in DB: {token}")
            return "invalid_token", None, None

        logger.info(f"👤 Matching user found: {user.username} (ID: {user.user_id})")
        user_id_pk = user.user_id

        if user.telegram_id == telegram_id_str:
            user.telegram_connect_token = None
            db.commit()
            return "already_linked", user.username, user_id_pk

        db.execute(update(User).where(User.telegram_id == telegram_id_str).values(telegram_id=None))

        user.telegram_id = telegram_id_str
        user.telegram_connect_token = None

        db.commit()
        db.refresh(user)

        logger.info(f"🎉 User {user.username} linked successfully to Telegram ID {telegram_id_str}")
        return "success", user.username, user_id_pk

    except Exception as e:
        logger.exception(f"❌ Database error in sync_link_telegram_user: {e}")
        db.rollback()
        return "error", None, None


@bot_router.message(CommandStart())
async def command_start_handler(message: TelegramMessage, command: CommandObject, db: Session | None = None) -> None:
    chat_id = message.chat.id
    user_id = message.from_user.id if message.from_user else "Unknown"
    logger.info(f"📥 Received /start command: Chat ID {chat_id}, User ID {user_id}")

    # Extract token parameter from "/start <token>"
    token = command.args
    if not token and message.text:
        # Fallback to manual parsing of start argument if CommandObject args failed
        parts = message.text.split()
        if len(parts) > 1:
            token = parts[1]
            logger.info(f"🔍 Extracted token manually from message text: {token}")

    user_name = message.from_user.full_name if message.from_user else "שם"

    if not token:
        logger.info("ℹ️ No token provided. Replying with default welcome message.")
        await message.answer(f"היי {user_name}, כדי לחבר את החשבון עליך להיכנס דרך כפתור החיבור באתר שלנו.")
        return

    logger.info(f"🔑 Attempting to process Telegram link for token: {token}")

    should_close_db = False
    if db is None:
        logger.info("🔌 Opening dynamic temporary SessionLocal...")
        db = SessionLocal()
        should_close_db = True

    try:
        telegram_id_str = str(user_id)
        if user_id == "Unknown":
            logger.warning("⚠️ user_id is 'Unknown', cannot link user details")
            await message.answer("לא הצלחנו לזהות את פרטי המשתמש שלך בטלגרם.")
            return

        # Execute DB actions synchronously in a separate thread to prevent blocking FastAPI event loop
        status, username, target_user_id = await asyncio.to_thread(sync_link_telegram_user, db, token, telegram_id_str)

        if status in ("success", "already_linked"):
            await message.answer(f"היי {username}, החיבור לטלגרם בוצע בהצלחה! 🎉")

            # Broadcast TELEGRAM_CONNECTED event across all active tabs of this user via WebSocket
            if target_user_id:
                try:
                    ws_payload = {
                        "type": "TELEGRAM_CONNECTED",
                        "payload": {
                            "telegram_id": int(telegram_id_str) if telegram_id_str.isdigit() else telegram_id_str,
                            "connected_at": datetime.now(UTC).isoformat(),
                            "status": "CONNECTED",
                        },
                    }
                    logger.info(f"📡 Broadcasting TELEGRAM_CONNECTED WS event to user {target_user_id}...")
                    await manager.send_personal_message(ws_payload, user_id=target_user_id)
                    logger.info(f"✅ WS event successfully broadcasted to user {target_user_id}")
                except Exception as ws_err:
                    logger.error(f"⚠️ Failed to send WS notification on telegram link: {ws_err}")

        elif status == "invalid_token":
            await message.answer("קישור החיבור פג תוקפו או שאינו חוקי. אנא צור קישור חדש באתר.")
        else:
            await message.answer("אירעה שגיאה בבסיס הנתונים במהלך החיבור. אנא נסה שנית מאוחר יותר.")

    except Exception as e:
        logger.exception(f"❌ Unhandled error in command_start_handler: {e}", exc_info=True)
        await message.answer("אירעה שגיאה לא צפויה במערכת. אנא נסה שנית מאוחר יותר.")
    finally:
        if should_close_db:
            logger.info("🔌 Closing dynamic temporary SessionLocal.")
            db.close()
