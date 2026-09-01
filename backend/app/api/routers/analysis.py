import logging

from fastapi import APIRouter, HTTPException, Query, status

import app.services.portfolio as pf
from app.services.ai_service import generate_stock_research

logger = logging.getLogger(__name__)

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
    try:
        return await generate_stock_research(ticker=ticker, language=language)
    except ValueError as ve:
        logger.warning(f"⚠️ Bad request for AI stock research ({ticker}): {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve
    except RuntimeError as re:
        logger.error(f"🚨 AI research unavailable for ({ticker}): {re}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is temporarily unavailable. Providers failed.",
        ) from re
    except Exception as e:
        logger.exception(f"🚨 Unexpected failure in AI stock research ({ticker}): {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is temporarily unavailable. Please try again later.",
        ) from e
