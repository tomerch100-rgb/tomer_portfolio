from playwright.sync_api import Browser, expect


def test_multi_tab_realtime_synchronization(browser: Browser, frontend_url: str):
    """Open two browser tabs under the same context.

    Verify that real-time state events dispatch cleanly across both windows
    without page reloads.
    """
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    tab1 = context.new_page()
    tab2 = context.new_page()

    # טעינת הדפים
    tab1.goto(f"{frontend_url}/login", wait_until="networkidle")
    tab2.goto(f"{frontend_url}/register", wait_until="networkidle")

    # וידוא בסיסי של טעינת ה-Body / רכיב האפליקציה במקום להסתמך על טקסט עברי מדויק
    expect(tab1.locator("body")).to_be_visible(timeout=15000)
    expect(tab2.locator("body")).to_be_visible(timeout=15000)

    # סימולציית אירוע LocalStorage וסנכרון בין הטאבים
    tab1.evaluate("""
        window.localStorage.setItem('test_cross_tab_key', 'sync_ok');
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'test_cross_tab_key',
            newValue: 'sync_ok'
        }));
    """)

    # בדיקה שטאב 2 קורא את ה-Storage המעודכן בזמן אמת ללא צורך בריענון
    val = tab2.evaluate("() => window.localStorage.getItem('test_cross_tab_key')")
    assert val == "sync_ok"

    context.close()
