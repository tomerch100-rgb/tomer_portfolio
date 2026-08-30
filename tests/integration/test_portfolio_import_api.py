import io
import pytest
from httpx import AsyncClient
from sqlalchemy.orm import Session
from app.models.portfolio import Portfolio
from app.models.user import User

@pytest.mark.asyncio
async def test_preview_file_size_limit_exceeded(client: AsyncClient, auth_headers: dict):
    """Verify upload files larger than 10MB are rejected with 400 or 413."""
    oversized = b"a" * (10 * 1024 * 1024 + 1024)
    files = {"file": ("big_file.csv", io.BytesIO(oversized), "text/csv")}
    
    response = await client.post("/api/portfolio/import/preview", headers=auth_headers, files=files)
    assert response.status_code in [400, 413]

@pytest.mark.asyncio
async def test_preview_unsupported_file_extension(client: AsyncClient, auth_headers: dict):
    """Verify unsupported file extensions are rejected with 400."""
    fake_pdf = b"%PDF-1.4 mock file"
    files = {"file": ("portfolio.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    
    response = await client.post("/api/portfolio/import/preview", headers=auth_headers, files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json().get("detail", "")

@pytest.mark.asyncio
async def test_preview_valid_csv_success(client: AsyncClient, auth_headers: dict):
    """Verify preview returns columns, suggested mappings, and sample rows."""
    csv_data = b"Ticker,Shares,Avg_Price,Sector\nAAPL,10,150.0,Tech\nNVDA,20,120.0,Tech\n"
    files = {"file": ("portfolio.csv", io.BytesIO(csv_data), "text/csv")}
    
    response = await client.post("/api/portfolio/import/preview", headers=auth_headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert "columns" in data
    assert "suggested_mapping" in data
    assert data["total_rows"] == 2
    assert len(data["preview_rows"]) == 2

@pytest.mark.asyncio
async def test_confirm_import_portfolio_success(client: AsyncClient, auth_headers: dict, test_user: User, db_session: Session):
    """Verify confirming import persists mapped rows into the portfolio database."""
    confirm_payload = {
        "mapping": {
            "Symbol": "ticker",
            "Quantity": "shares",
            "BuyPrice": "avg_price",
            "Category": "sector"
        },
        "overwrite_existing": False,
        "rows": [
            {"Symbol": "META", "Quantity": 15, "BuyPrice": 500.0, "Category": "Technology"},
            {"Symbol": "AMZN", "Quantity": 25, "BuyPrice": 180.0, "Category": "Consumer Cyclical"}
        ]
    }
    response = await client.post("/api/portfolio/import/confirm", headers=auth_headers, json=confirm_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["imported_count"] == 2

    # Verify rows in DB
    holdings = db_session.query(Portfolio).filter_by(user_id=test_user.user_id).all()
    tickers = [h.ticker for h in holdings]
    assert "META" in tickers
    assert "AMZN" in tickers
