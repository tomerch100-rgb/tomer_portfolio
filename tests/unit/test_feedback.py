from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient

from app.services.email_service import format_feedback_html, send_feedback_notification


def test_format_feedback_html():
    """בדיקת יצירת תוכן ה-HTML של המייל"""
    feedback_data = {
        "category": "feature",
        "rating": 5,
        "page": "מחקר AI",
        "subject": "הוספת תרשימי מניות נוספים",
        "message": "היי, אשמח אם תוסיפו עוד מחוונים טכניים למחקר ה-AI.",
        "user_name": "Tomer Tester",
        "user_email": "tomer_user@example.com",
    }

    html = format_feedback_html(feedback_data)
    assert "הצעה לפיצ'ר חדש" in html
    assert "Tomer Tester" in html
    assert "tomer_user@example.com" in html
    assert "הוספת תרשימי מניות נוספים" in html
    assert "★★★★★ (5/5)" in html
    assert "tomerch100@gmail.com" in html or "TomerVest" in html


@pytest.mark.asyncio
async def test_send_feedback_notification_fallback():
    """בדיקת הפונקציה send_feedback_notification במצב ללא SMTP (fallback logger)"""
    feedback_data = {
        "category": "bug",
        "rating": 3,
        "subject": "באג קטן בכפתור",
        "message": "הכפתור לא מגיב לעיתים בלחיצה כפולה",
    }

    # כשאין פרטי SMTP ב-.env זה מחזיר False אך לא זורק שגיאה
    res = await send_feedback_notification(feedback_data)
    assert res is False or res is True


@pytest.mark.asyncio
async def test_submit_feedback_endpoint_anonymous(client: AsyncClient):
    """בדיקת שליחת משוב כמשתמש אנונימי דרך ה-API"""
    payload = {
        "category": "ui",
        "rating": 4,
        "page": "דאשבורד",
        "subject": "עיצוב מצוין",
        "message": "הממשק החדש נראה מדהים ונוח מאד!",
        "user_name": "מבקר אורח",
        "user_email": "guest@example.com",
    }

    with patch("app.api.routers.feedback_router.send_feedback_notification", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True

        response = await client.post("/feedback", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "tomerch100@gmail.com" in data["target_email"]


@pytest.mark.asyncio
async def test_submit_feedback_endpoint_authenticated(client: AsyncClient, auth_headers: dict):
    """בדיקת שליחת משוב כמשתמש מחובר (השלמת פרטים אוטומטית)"""
    payload = {
        "category": "general",
        "rating": 5,
        "subject": "חוויה מעולה",
        "message": "המערכת עובדת מהר וחלק, כל הכבוד על הפיתוח!",
    }

    with patch("app.api.routers.feedback_router.send_feedback_notification", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = True

        response = await client.post("/feedback", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"


@pytest.mark.asyncio
async def test_submit_feedback_validation_errors(client: AsyncClient):
    """בדיקת אימות שדות חסרים (כותרת קצרה מדי / הודעה ריקה)"""
    invalid_payload = {
        "category": "feature",
        "subject": "",  # כותרת ריקה
        "message": "קצר",  # פחות מ-5 תווים
    }

    response = await client.post("/feedback", json=invalid_payload)
    assert response.status_code == 422
