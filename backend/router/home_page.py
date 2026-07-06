from fastapi import APIRouter,Depends,HTTPException 
import connectors.portfolio_function as pf
from core import security

router = APIRouter(
    tags=["home"]
)



@router.get("/")
def home():
    return {"message": "welcome to tomer's stock portfolio "}

@router.get ("/me") 
def me_function (user_id = Depends(security.get_current_user_id) ) :
    user_data = pf.get_me(user_id)
    if user_data is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user_data

