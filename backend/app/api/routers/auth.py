from fastapi import APIRouter, HTTPException, Response, Depends,status
from sqlalchemy.orm import Session
from app.schemas import UserRegister, UserLogin
from app.db.session import get_db
import app.services.portfolio_function as pf
from app.core import security

router = APIRouter(
  prefix="/auth", tags=["auth"]

)
COOKIE_NAME = "my_access_token"

@router.post("/register")
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    return pf.register_user(db, user.username, user.password, user.email)

@router.post("/login")
def login_user(user: UserLogin, response: Response, db: Session = Depends(get_db)):
    user_id = pf.login_user(db, user.username, user.password)

    if user_id is None:
        raise HTTPException(status_code=401, detail="wrong details")   
    
    access_token = security.creat_token(user_id)
    response.set_cookie(
        key="my_access_token",  
        value=access_token,     
        httponly=True,        
        secure=False,           
        samesite="lax"
    )

    return {
        "user_id": user_id,
        "username": user.username,
    }


    
@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """
    Clear the auth cookie and end the session.
    """
    response.delete_cookie(
        key=COOKIE_NAME,
        httponly=True,
        samesite="none",  # Здесь тоже меняем, иначе кука не удалится при выходе
        secure=True,
    )
    return {"message": "Logged out successfully"}

@router.get("/me")
def get_me(db: Session = Depends(get_db), current_user_id: int = Depends(security.get_current_user_id)):
    user_info = pf.get_me(db, current_user_id)
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")
    return user_info

