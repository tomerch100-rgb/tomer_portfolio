import logging
import os

from aiogram import Bot, Dispatcher, Router
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN environment variable is not set")

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()
bot_router = Router()
