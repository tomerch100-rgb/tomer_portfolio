from app.api.routers import auth , orders ,display,analysis,charts_r,home_page,watchlist,transaction_router
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI
from app.db.session import engine  
from app.db.base_class import Base
from app.services.telegram.telegram_service import bot
from app.api.routers.telegram.webhook_telegram import router as telegram_router
from app.api.routers.telegram import telegram_link

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    WEBHOOK_URL = os.getenv("WEBHOOK_URL") 
    
    if WEBHOOK_URL:
        full_webhook_path = f"{WEBHOOK_URL}/api/telegram/webhook"
        
        await bot.set_webhook(url=full_webhook_path)
        print(f"✅ Webhook registered at: {full_webhook_path}")
    else:
        print("⚠️ WEBHOOK_URL not found in .env")
    yield  
    
    await bot.delete_webhook()
    print("🛑 Webhook deleted")


app = FastAPI()

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
app.include_router(orders.router )
app.include_router(display.router )
app.include_router(analysis.router )
app.include_router(charts_r.router)
app.include_router(home_page.router )
app.include_router(watchlist.router )
app.include_router(transaction_router.router)
app.include_router(telegram_router)
app.include_router(telegram_link.router )





Base.metadata.create_all(bind=engine)