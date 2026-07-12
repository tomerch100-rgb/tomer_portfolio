from fastapi import APIRouter, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from classes import schema as lc
from db.database import get_db
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags=["auth"]
)

@router.post("/register")
def register_user(user: lc.User_register, db: Session = Depends(get_db)):
    return pf.register_user(db, user.username, user.password, user.email)

@router.post("/login")
def login_user(user: lc.User_login, response: Response, db: Session = Depends(get_db)):
    user_id = pf.login_user(db, user.username, user.password)

    if user_id is None:
        raise HTTPException(status_code=401, detail="wrong details")   
    
    access_token = security.creat_token(user_id)
    response.set_cookie(
        key="my_access_token",  
        value=access_token,     
        httponly=True,        
        secure=True,           
        samesite="lax"
    )

    return {
        "user_id": user_id,
        "username": user.username,
    }