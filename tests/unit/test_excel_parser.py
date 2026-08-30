import io
import pytest
import pandas as pd
from app.services.portfolio_import.excel_parser import (
    excel_parser,
    ExcelParserError,
    UnsupportedFileFormatError,
    EmptyFileError
)

@pytest.mark.asyncio
async def test_parse_valid_csv_english_headers():
    """Verify parsing standard CSV with English headers."""
    csv_content = b"Ticker,Shares,Avg_Price,Sector\nAAPL,10,150.50,Technology\nNVDA,25,120.00,Technology\n"
    cols, rows, total = await excel_parser.parse_all_rows(csv_content, "portfolio.csv")
    
    assert len(cols) == 4
    assert "Ticker" in cols
    assert "Shares" in cols
    assert total == 2
    assert len(rows) == 2
    assert rows[0]["Ticker"] == "AAPL"

@pytest.mark.asyncio
async def test_parse_valid_csv_hebrew_headers():
    """Verify parsing CSV containing Hebrew headers (e.g. ישראכרט, כמות, מחיר)."""
    csv_content = "סימול,כמות,מחיר ממוצע,מגזר\nTSLA,15,220.0,רכב\nMSFT,8,410.0,טכנולוגיה\n".encode("utf-8")
    cols, rows, total = await excel_parser.parse_all_rows(csv_content, "תיק_השקעות.csv")
    
    assert "סימול" in cols
    assert "כמות" in cols
    assert total == 2
    assert rows[0]["סימול"] == "TSLA"

@pytest.mark.asyncio
async def test_parse_valid_excel_xlsx():
    """Verify parsing genuine Excel .xlsx binary files."""
    df = pd.DataFrame({
        "Symbol": ["AMZN", "GOOGL"],
        "Quantity": [12, 20],
        "Price": [180.0, 165.5]
    })
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    
    excel_bytes = output.getvalue()
    cols, rows, total = await excel_parser.parse_all_rows(excel_bytes, "investments.xlsx")
    
    assert len(cols) == 3
    assert total == 2
    assert rows[0]["Symbol"] == "AMZN"

@pytest.mark.asyncio
async def test_parse_empty_file_raises_error():
    """Verify that an empty file raises EmptyFileError."""
    with pytest.raises(EmptyFileError):
        await excel_parser.parse_all_rows(b"", "empty.csv")

@pytest.mark.asyncio
async def test_parse_unsupported_format_raises_error():
    """Verify that non-supported file formats (e.g. .pdf, .json) raise UnsupportedFileFormatError."""
    with pytest.raises(UnsupportedFileFormatError):
        await excel_parser.parse_all_rows(b"%PDF-1.4...", "statement.pdf")

@pytest.mark.asyncio
async def test_preview_row_limit():
    """Verify preview rows are bounded to max_preview_rows parameter."""
    rows_data = [{"Ticker": f"STK{i}", "Shares": i, "Price": 100} for i in range(50)]
    df = pd.DataFrame(rows_data)
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    
    cols, preview_rows, total = await excel_parser.parse_preview(csv_bytes, "large.csv", max_preview_rows=5)
    assert total == 50
    assert len(preview_rows) == 5
