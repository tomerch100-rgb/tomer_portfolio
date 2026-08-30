import pytest

from app.services.portfolio_import.ai_column_mapper import (
    ai_column_mapper,
)


def test_rule_based_mapping_exact_matches():
    """Verify rule-based mapping accurately identifies standard English columns."""
    columns = ["Ticker", "Shares", "Avg Price", "Sector", "Take Profit", "Stop Loss"]
    sample_rows = [
        {"Ticker": "AAPL", "Shares": 10, "Avg Price": 150.0, "Sector": "Tech", "Take Profit": 200.0, "Stop Loss": 130.0}
    ]
    result = ai_column_mapper._rule_based_mapping(columns, sample_rows)
    mapping = result["mapping"]

    assert mapping.get("Ticker") == "ticker"
    assert mapping.get("Shares") == "shares"
    assert mapping.get("Avg Price") == "avg_price"
    assert mapping.get("Sector") == "sector"
    assert mapping.get("Take Profit") == "take_profit"
    assert mapping.get("Stop Loss") == "stop_loss"


def test_rule_based_mapping_hebrew_headers():
    """Verify rule-based mapping accurately translates common Hebrew broker columns."""
    columns = ["סימול מניה", "כמות מניות", "שער קניה ממוצע", "מגזר פעילות"]
    sample_rows = [{"סימול מניה": "TSLA", "כמות מניות": 5, "שער קניה ממוצע": 200.0, "מגזר פעילות": "Auto"}]
    result = ai_column_mapper._rule_based_mapping(columns, sample_rows)
    mapping = result["mapping"]

    assert mapping.get("סימול מניה") == "ticker"
    assert mapping.get("כמות מניות") == "shares"
    assert mapping.get("שער קניה ממוצע") == "avg_price"
    assert mapping.get("מגזר פעילות") == "sector"


def test_confidence_calculation_perfect_match():
    """Verify high confidence when required fields (ticker, shares, avg_price) are mapped."""
    columns = ["Ticker", "Shares", "Avg Price"]
    sample_rows = [{"Ticker": "NVDA", "Shares": 10, "Avg Price": 120.0}]
    result = ai_column_mapper._rule_based_mapping(columns, sample_rows)
    assert result["confidence"] >= 0.85


@pytest.mark.asyncio
async def test_map_columns_fallback_on_ai_failure(monkeypatch):
    """Verify that map_columns falls back to rule-based mapping if AI providers fail."""

    def mock_fail_ai(*args, **kwargs):
        raise RuntimeError("AI service unavailable")

    monkeypatch.setattr(ai_column_mapper, "_call_groq_sync", mock_fail_ai)
    monkeypatch.setattr(ai_column_mapper, "_call_gemini_sync", mock_fail_ai)
    monkeypatch.setattr(ai_column_mapper, "_call_openrouter_sync", mock_fail_ai)

    columns = ["Symbol", "Quantity", "Average Price"]
    sample_rows = [{"Symbol": "NVDA", "Quantity": 10, "Average Price": 120.0}]

    result = await ai_column_mapper.map_columns(columns, sample_rows)
    mapping = result["mapping"]

    assert mapping.get("Symbol") == "ticker"
    assert mapping.get("Quantity") == "shares"
    assert mapping.get("Average Price") == "avg_price"
    assert result["confidence"] >= 0.8
