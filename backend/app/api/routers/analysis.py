from fastapi import APIRouter
import app.services.portfolio_function as pf
router = APIRouter(
    prefix="/analysis"  , tags= ["analysis"] 
)

@router.get ("/stock_analysis")
async def stock_analysis (spec_stock : str) :
    return await pf.stock_analysis (spec_stock)

@router.get ("/stock_details")
async def stock_details (spec_stock : str) :
    return await pf.get_stock_details (spec_stock)