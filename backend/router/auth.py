
from fastapi import responses
from fastapi import APIRouter ,HTTPException , Response
from pydantic import BaseModel, EmailStr
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags= ["auth"]
)

class User_register (BaseModel):
    username: str
    password: str
    email: EmailStr

class User_login (BaseModel):
    username: str
    password: str



@router.post("/register")
def register_user(user: User_register ):
        return pf.register_user(user.username, user.password, user.email)

@router.post("/login")
def login_user(user: User_login,response:Response):
        user_id = pf.login_user(user.username, user.password)

        if user_id is None :
            raise HTTPException (status_code=401, detail="wrong details")   
        access_token =  security.creat_token(user_id)
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