import secrets
import os
from app.crud.crud_user import crud_user
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import get_current_user_id
from app.models.user import User
from app.db.session import get_db

router = APIRouter(
    prefix="/api/link/telegram",
    tags=["telegram"]
)

@router.post("/generate-telegram-token")
async def generate_telegram_token(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    if not current_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User ID not found in token"
        )

    user = crud_user.get_user_by_id(db, current_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found in database"
        )

    token = secrets.token_hex(16)
    user.telegram_connect_token = token    

    db.commit()
    db.refresh(user)

    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "TomerVestbot")
    telegram_url = f"https://t.me/{bot_username}?start={token}"

    return {"telegram_url": telegram_url}
