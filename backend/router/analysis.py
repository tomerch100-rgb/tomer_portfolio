from fastapi import APIRouter
import connectors.portfolio_function as pf
router = APIRouter()

@router.get ("/stock_analysis")
def stock_analysis (spec_stock : str) :
    return pf.stock_analysis (spec_stock)