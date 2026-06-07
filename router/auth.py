from fastapi import APIRouter ,HTTPException
from pydantic import BaseModel, EmailStr
import portfolio_function as pf
import security 

# יוצרים את הראוטר
router = APIRouter()

# כאן אפשר להגדיר שוב את ה-User אם צריך, או לייבא אותו
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
def login_user(user: User_login):
        user_id = pf.login_user(user.username, user.password)

        if user_id is None :
            raise HTTPException (status_code=401, detail="wrong details")   
        access_token =  security.creat_token(user_id)
        return {
        "access_token": access_token,
        "token_type": "bearer"
    }