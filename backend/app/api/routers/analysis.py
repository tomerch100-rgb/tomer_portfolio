import app.services.portfolio as pf
from app.services.ai_service import generate_stock_research
from fastapi import APIRouter, Query

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/stock_analysis")
async def stock_analysis(spec_stock: str):
    return await pf.stock_analysis(spec_stock)


@router.get("/stock_details")
async def stock_details(spec_stock: str):
    return await pf.get_stock_details(spec_stock)


@router.get("/ai_research")
async def ai_stock_research(
    ticker: str = Query(..., description="סימול מניה למחקר AI"),
    language: str = Query("he", description="שפת הדוח (he / en)"),
):
    return await generate_stock_research(ticker=ticker, language=language)
