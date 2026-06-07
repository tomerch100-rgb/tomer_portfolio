from fastapi import APIRouter,Depends 
import portfolio_function as pf
import security

router = APIRouter()



@router.get("/")
def home():
    return {"message": "welcome to tomer's stock portfolio "}

@router.get ("/me") 
def me_function (username , ) :
