import pytest
from pydantic import ValidationError

from app.services.ai_service import (
    StockResearchReport,
    clean_json_response,
    generate_stock_research,
    run_ai_roulette,
)


def test_clean_json_response_with_markdown_fences():
    """Verify clean_json_response strips markdown ```json code blocks."""
    raw_markdown = """
    ```json
    {
        "ticker": "NVDA",
        "company_name": "NVIDIA Corp",
        "summary": "Strong AI leader",
        "score": {
            "growth": 95,
            "valuation": 60,
            "profitability": 90,
            "overall_score": 85
        },
        "bull_case": ["Data center growth", "CUDA moat"],
        "bear_case": ["High valuation multiple", "Supply chain constraints"],
        "what_to_monitor": "Next quarter data center revenue",
        "target_recommendation": "BUY"
    }
    ```
    """
    parsed = clean_json_response(raw_markdown)
    assert parsed["ticker"] == "NVDA"
    assert parsed["score"]["growth"] == 95


def test_pydantic_schema_validation_valid():
    """Verify StockResearchReport successfully validates valid payload."""
    data = {
        "ticker": "AAPL",
        "company_name": "Apple Inc.",
        "summary": "Consumer electronics giant",
        "score": {"growth": 80, "valuation": 70, "profitability": 95, "overall_score": 82},
        "bull_case": ["Services revenue growing", "High buyback rate"],
        "bear_case": ["China sales slowdown"],
        "what_to_monitor": "iPhone upgrade cycle",
        "target_recommendation": "BUY",
    }
    report = StockResearchReport.model_validate(data)
    assert report.ticker == "AAPL"
    assert report.score.overall_score == 82


def test_pydantic_schema_validation_invalid_score_range():
    """Verify validation fails if a score is out of 0-100 bounds."""
    invalid_data = {
        "ticker": "AAPL",
        "summary": "Test",
        "score": {
            "growth": 150,  # Out of bounds (ge=0, le=100)
            "valuation": 50,
            "profitability": 50,
            "overall_score": 50,
        },
        "bull_case": ["Bull"],
        "bear_case": ["Bear"],
        "what_to_monitor": "Monitor",
    }
    with pytest.raises(ValidationError):
        StockResearchReport.model_validate(invalid_data)


@pytest.mark.asyncio
async def test_ai_roulette_fallback_when_first_provider_times_out(monkeypatch):
    """Verify that if the first provider raises TimeoutError, roulette falls back to next provider."""

    async def mock_timeout_groq(prompt):
        raise TimeoutError("Groq timed out after 15.0s")

    async def mock_success_gemini(prompt):
        return """{
            "ticker": "TSLA",
            "company_name": "Tesla Inc",
            "summary": "EV and energy leader",
            "score": {
                "growth": 88,
                "valuation": 55,
                "profitability": 75,
                "overall_score": 76
            },
            "bull_case": ["FSD progress", "Energy storage scaling"],
            "bear_case": ["Auto gross margin compression"],
            "what_to_monitor": "Robotaxi launch",
            "target_recommendation": "HOLD"
        }"""

    monkeypatch.setattr("app.services.ai_service.call_groq", mock_timeout_groq)
    monkeypatch.setattr("app.services.ai_service.call_gemini", mock_success_gemini)

    result = await run_ai_roulette("Analyze TSLA")
    assert result["ticker"] == "TSLA"
    assert result["score"]["overall_score"] == 76


@pytest.mark.asyncio
async def test_generate_stock_research_uses_cache(monkeypatch):
    """Verify that cached research report is returned without calling AI providers."""
    clean_ticker = "GOOGL"
    cache_key = f"ai_stock_research:{clean_ticker}:he"

    mock_cached_report = {
        "ticker": "GOOGL",
        "company_name": "Alphabet Inc.",
        "summary": "Cached report from Redis",
        "score": {"growth": 85, "valuation": 80, "profitability": 90, "overall_score": 85},
        "bull_case": ["Cloud profitability"],
        "bear_case": ["Search ad disruption"],
        "what_to_monitor": "Gemini AI adoption",
        "target_recommendation": "BUY",
    }

    async def mock_get_cached(key):
        if key == cache_key:
            return mock_cached_report
        return None

    monkeypatch.setattr("app.services.ai_service.get_cached_data", mock_get_cached)

    result = await generate_stock_research("GOOGL", language="he")
    assert result["summary"] == "Cached report from Redis"


def test_analysis_router_endpoints(monkeypatch):
    """Test analysis router endpoints with FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)

    # 1. Test /analysis/stock_details
    async def mock_details(ticker):
        return {"ticker": ticker, "current_price": 150.0, "company_name": "Test Company"}

    monkeypatch.setattr("app.services.portfolio.get_stock_details", mock_details)
    res = client.get("/analysis/stock_details?spec_stock=AAPL")
    assert res.status_code == 200
    assert res.json()["current_price"] == 150.0

    # 2. Test /analysis/stock_analysis
    async def mock_analysis(ticker):
        return {"ticker": ticker, "analysis": "Strong buy"}

    monkeypatch.setattr("app.services.portfolio.stock_analysis", mock_analysis)
    res = client.get("/analysis/stock_analysis?spec_stock=AAPL")
    assert res.status_code == 200

    # 3. Test /analysis/ai_research success
    async def mock_ai_research(ticker, language):
        return {
            "ticker": ticker,
            "company_name": "Test Co",
            "summary": "Solid",
            "score": {"growth": 80, "valuation": 70, "profitability": 90, "overall_score": 80},
            "bull_case": ["Growth"],
            "bear_case": ["Competition"],
            "what_to_monitor": "Earnings",
            "target_recommendation": "BUY",
        }

    monkeypatch.setattr("app.api.routers.analysis.generate_stock_research", mock_ai_research)
    res = client.get("/analysis/ai_research?ticker=AAPL&language=he")
    assert res.status_code == 200
    assert res.json()["score"]["overall_score"] == 80

    # 4. Test /analysis/ai_research 503 error handling on RuntimeError
    async def mock_ai_error(ticker, language):
        raise RuntimeError("All providers failed")

    monkeypatch.setattr("app.api.routers.analysis.generate_stock_research", mock_ai_error)
    res = client.get("/analysis/ai_research?ticker=FAIL&language=he")
    assert res.status_code == 503
    assert "temporarily unavailable" in res.json()["detail"]

    # 5. Test /analysis/ai_research 400 error handling on ValueError
    async def mock_bad_ticker(ticker, language):
        raise ValueError("Invalid ticker format")

    monkeypatch.setattr("app.api.routers.analysis.generate_stock_research", mock_bad_ticker)
    res = client.get("/analysis/ai_research?ticker=BAD&language=he")
    assert res.status_code == 400
    assert "Invalid ticker format" in res.json()["detail"]

