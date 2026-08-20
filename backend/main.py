from app.api.routers import auth, orders, display, analysis, charts_r, home_page, watchlist, transaction_router, ws_router
from dotenv import load_dotenv

import os
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI
from app.db.session import engine  
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.base_class import Base
from app.services.stock_scanner import check_prices_and_alert
from app.services.telegram.telegram_service import bot
from app.api.routers.telegram.webhook_telegram import router as telegram_router
from app.api.routers.telegram import telegram_link

load_dotenv()
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Register Telegram Webhook if configured
    WEBHOOK_URL = os.getenv("WEBHOOK_URL") 
    if WEBHOOK_URL:
        full_webhook_path = f"{WEBHOOK_URL}/api/telegram/webhook"
        try:
            await bot.set_webhook(url=full_webhook_path)
            print(f"✅ Webhook registered at: {full_webhook_path}")
        except Exception as e:
            print(f"⚠️ Failed to register webhook: {e}")
    else:
        print("⚠️ WEBHOOK_URL not found in .env")

    # 2. Start Background Periodic Stock Scanner
    try:
        scheduler.add_job(check_prices_and_alert, 'interval', minutes=10)
        scheduler.start()
        print("⏱️ Background stock scanner started (runs every 5 minutes).")
    except Exception as e:
        print(f"⚠️ Failed to start scheduler: {e}")

    yield  

    # 3. Graceful shutdown
    try:
        scheduler.shutdown(wait=False) 
        print("🛑 Scheduler shutdown complete.")
    except Exception as e:
        print(f"⚠️ Scheduler shutdown error: {e}")
        
    try:
        await bot.delete_webhook()
        print("🛑 Webhook deleted")
    except Exception as e:
        print(f"⚠️ Webhook deletion warning: {e}")

app = FastAPI(
    title="TomerVest API",
    description="High-performance asynchronous stock portfolio tracking & Telegram alerting API",
    version="2.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173", 
    "http://localhost:5175", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(display.router)
app.include_router(analysis.router)
app.include_router(charts_r.router)
app.include_router(home_page.router)
app.include_router(watchlist.router)
app.include_router(transaction_router.router)
app.include_router(telegram_router)
app.include_router(telegram_link.router)
app.include_router(ws_router.router)

Base.metadata.create_all(bind=engine)