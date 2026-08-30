import pytest
import asyncio
from app.services.ai_service import (
    clean_json_response,
    StockResearchReport,
    StockScore,
    run_ai_roulette,
    generate_stock_research,
    AI_TIMEOUT_SECONDS
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
        "score": {
            "growth": 80,
            "valuation": 70,
            "profitability": 95,
            "overall_score": 82
        },
        "bull_case": ["Services revenue growing", "High buyback rate"],
        "bear_case": ["China sales slowdown"],
        "what_to_monitor": "iPhone upgrade cycle",
        "target_recommendation": "BUY"
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
            "growth": 150, # Out of bounds (ge=0, le=100)
            "valuation": 50,
            "profitability": 50,
            "overall_score": 50
        },
        "bull_case": ["Bull"],
        "bear_case": ["Bear"],
        "what_to_monitor": "Monitor"
    }
    with pytest.raises(Exception):
        StockResearchReport.model_validate(invalid_data)

@pytest.mark.asyncio
async def test_ai_roulette_fallback_when_first_provider_times_out(monkeypatch):
    """Verify that if the first provider raises TimeoutError, roulette falls back to next provider."""
    async def mock_timeout_groq(prompt):
        raise asyncio.TimeoutError("Groq timed out after 15.0s")

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
        "target_recommendation": "BUY"
    }

    async def mock_get_cached(key):
        if key == cache_key:
            return mock_cached_report
        return None

    monkeypatch.setattr("app.services.ai_service.get_cached_data", mock_get_cached)

    result = await generate_stock_research("GOOGL", language="he")
    assert result["summary"] == "Cached report from Redis"
