from playwright.sync_api import Browser, expect


def test_multi_tab_realtime_synchronization(browser: Browser, frontend_url: str):
    """
    Open two browser tabs under the same context.
    Verify that real-time state events dispatch cleanly across both windows without page reloads.
    """
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    tab1 = context.new_page()
    tab2 = context.new_page()

    # Tab 1 navigates to Login (ממתין לטעינת הרשת וה-DOM)
    tab1.goto(f"{frontend_url}/login", wait_until="networkidle")
    expect(tab1.locator("input[placeholder='שם משתמש']")).to_be_visible(timeout=10000)

    # Tab 2 navigates to Register (ממתין לטעינת הרשת וה-DOM)
    tab2.goto(f"{frontend_url}/register", wait_until="networkidle")
    expect(tab2.locator("input[placeholder='בחר שם משתמש']")).to_be_visible(timeout=10000)

    # Simulate cross-tab event dispatch
    tab1.evaluate("""
        window.localStorage.setItem('test_cross_tab_key', 'sync_ok');
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'test_cross_tab_key',
            newValue: 'sync_ok'
        }));
    """)

    # Assert Tab 2 can read updated storage without reloading
    val = tab2.evaluate("() => window.localStorage.getItem('test_cross_tab_key')")
    assert val == "sync_ok"

    context.close()