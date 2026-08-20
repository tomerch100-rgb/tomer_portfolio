import os
import logging
from dotenv import load_dotenv
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton , ReplyKeyboardRemove

from core.ws_manager import manager
from aiogram import Bot, Dispatcher, Router, types, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message as TelegramMessage


import os
import requests
from dotenv import load_dotenv


logger = logging.getLogger(__name__)

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
if not TELEGRAM_TOKEN:
    raise ValueError("TELEGRAM_TOKEN environment variable is not set")

bot = Bot(token=TELEGRAM_TOKEN)
dp = Dispatcher()
bot_router = Router()

