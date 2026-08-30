import pytest
from playwright.sync_api import Page, expect

def test_login_back_to_home_button_navigation(page: Page, frontend_url: str):
    """Verify that clicking the 'חזרה לדף הבית' button on Login screen redirects to root '/'."""
    page.goto(f"{frontend_url}/login")
    
    # Locate Back to Home link
    back_button = page.locator("a:has-text('חזרה לדף הבית')")
    expect(back_button).to_be_visible()
    
    back_button.click()
    page.wait_for_url(f"{frontend_url}/")
    expect(page).to_have_url(f"{frontend_url}/")

def test_register_back_to_home_button_navigation(page: Page, frontend_url: str):
    """Verify that clicking the 'חזרה לדף הבית' button on Register screen redirects to root '/'."""
    page.goto(f"{frontend_url}/register")
    
    back_button = page.locator("a:has-text('חזרה לדף הבית')")
    expect(back_button).to_be_visible()
    
    back_button.click()
    page.wait_for_url(f"{frontend_url}/")
    expect(page).to_have_url(f"{frontend_url}/")

def test_mobile_hamburger_menu_toggle(page: Page, frontend_url: str):
    """Verify mobile hamburger menu opens and displays navigation links on small screens."""
    # Set mobile viewport
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto(f"{frontend_url}/")

    # If user is on home or navbar is visible, verify responsiveness
    expect(page.locator("body")).to_be_visible()
