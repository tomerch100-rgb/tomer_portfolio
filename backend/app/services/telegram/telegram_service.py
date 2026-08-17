import os
import logging
import asyncio
from dotenv import load_dotenv
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.ws_manager import manager
from aiogram import Bot, Dispatcher, Router, types, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message as TelegramMessage
from app.models import User
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN environment variable is not set")

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()
bot_router = Router()

dp.include_router(bot_router)

def sync_link_telegram_user(db: Session, token: str, telegram_id: str) -> tuple[str, str | None]:
    """
    Synchronously query, update, and commit user Telegram connection details.
    Runs inside a worker thread to keep the FastAPI asyncio event loop completely unblocked.
    """
    telegram_id_str = str(telegram_id)
    
    logger.info(f"⚙️ Running sync_link_telegram_user - Token: {token}, Telegram ID: {telegram_id_str}")
    
    try:
        user = db.scalars(select(User).where(User.telegram_connect_token == token)).first()
        
        if not user:
            logger.warning(f"⚠️ Token not found in DB: {token}")
            return "invalid_token", None
            
        logger.info(f"👤 Matching user found: {user.username} (ID: {user.user_id})")

        if user.telegram_id == telegram_id_str:
            user.telegram_connect_token = None
            db.commit()
            return "already_linked", user.username

        db.execute(
            update(User)
            .where(User.telegram_id == telegram_id_str)
            .values(telegram_id=None)
        )    

        user.telegram_id = telegram_id_str
        user.telegram_connect_token = None
        
        db.commit()
        db.refresh(user)
        
        logger.info(f"🎉 User {user.username} linked successfully to Telegram ID {telegram_id_str}")
        return "success", user.username
        
    except Exception as e:
        logger.error(f"❌ Database error in sync_link_telegram_user: {e}", exc_info=True)
        db.rollback()
        return "error", None

@bot_router.message(CommandStart())
async def command_start_handler(
    message: TelegramMessage, 
    command: CommandObject, 
    db: Session | None = None
) -> None:
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
        status, username = await asyncio.to_thread(
            sync_link_telegram_user, db, token, telegram_id_str
        )
        
        if status == "success":
            await message.answer(f"היי {username}, החיבור לטלגרם בוצע בהצלחה! 🎉")
        elif status == "invalid_token":
            await message.answer("קישור החיבור פג תוקפו או שאינו חוקי. אנא צור קישור חדש באתר.")
        else:
            await message.answer("אירעה שגיאה בבסיס הנתונים במהלך החיבור. אנא נסה שנית מאוחר יותר.")
            
    except Exception as e:
        logger.error(f"❌ Unhandled error in command_start_handler: {e}", exc_info=True)
        await message.answer("אירעה שגיאה לא צפויה במערכת. אנא נסה שנית מאוחר יותר.")
    finally:
        if should_close_db:
            logger.info("🔌 Closing dynamic temporary SessionLocal.")
            db.close()