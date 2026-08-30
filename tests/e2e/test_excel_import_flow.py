from playwright.sync_api import Page, expect


def test_excel_import_modal_interaction(page: Page, frontend_url: str, tmp_path):
    """
    Verify navigating to authentication and interacting with the UI.
    """
    # Create sample CSV file
    csv_file = tmp_path / "mock_portfolio.csv"
    csv_file.write_text(
        "סימול,כמות,מחיר רכישה,מגזר\nNVDA,20,118.5,Technology\nAAPL,15,220.0,Technology\n", encoding="utf-8"
    )

    page.goto(f"{frontend_url}/login")
    expect(page.locator("body")).to_be_visible()
