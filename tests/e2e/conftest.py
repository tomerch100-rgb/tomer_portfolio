import pytest
import os
from playwright.sync_api import Browser, BrowserContext, Page

BASE_FRONTEND_URL = os.getenv("E2E_BASE_URL", "http://localhost:5173")

@pytest.fixture(scope="session")
def frontend_url():
    return BASE_FRONTEND_URL

@pytest.fixture
def clean_context(browser: Browser) -> BrowserContext:
    """Provides a pristine browser context with RTL and modern viewport configuration."""
    context = browser.new_context(
        viewport={"width": 1280, "height": 800},
        locale="he-IL",
        timezone_id="Asia/Jerusalem"
    )
    yield context
    context.close()
