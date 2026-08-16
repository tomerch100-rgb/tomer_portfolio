import secrets
from app.crud.crud_user import crud_user
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user_id
from app.models.user import User
from app.db.session import get_db

router = APIRouter(
    prefix="/api/link/telegram",
    tags=["telegram"]
)

@router.post("/generate-telegram-token")
async def generate_telegram_token(current_user: tuple = Depends(get_current_user_id),db: Session = Depends(get_db)):
    token = secrets.token_hex(16)

    user_id = current_user
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in token")

    user =  crud_user.get_user_by_id(db,user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database")
    token = secrets.token_hex(16)
    user.telegram_connect_token = token    

    db.commit()
    db.refresh(user)

    bot_username = "TomerVestbot"
    telegram_url = f"https://t.me/{bot_username}?start={token}"

    return {"telegram_url": telegram_url}
