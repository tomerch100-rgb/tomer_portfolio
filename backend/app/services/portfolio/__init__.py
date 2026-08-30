"""
Portfolio service package.

This subpackage contains all portfolio management services including:
- Core portfolio operations (add/sell stock, show portfolio, portfolio summary)
- Analytics & stock details
- Charts & performance history
- User portfolio management & authentication helpers
- Watchlist management
- Stock helper utilities
"""

from app.services.transaction_service import transaction_log_history

from . import (
    helpers_stock,
    portfolio_analytics_service,
    portfolio_chart_service,
    portfolio_core_service,
    portfolio_user_service,
    portfolio_watchlist_service,
)
from .helpers_stock import sum_daily_change, sum_pl, update_prices
from .portfolio_analytics_service import get_stock_details, stock_analysis
from .portfolio_chart_service import (
    get_daily_change,
    get_portfolio_history,
    get_protfolio_pie,
)
from .portfolio_core_service import (
    add_stock,
    portfolio_summary,
    save_current_portfolio_value,
    sell_stock,
    show_portfolio,
)
from .portfolio_user_service import get_me, login_user, register_user
from .portfolio_watchlist_service import (
    get_watchlist,
    post_watchlist,
    update_alert_service,
)

__all__ = [
    # Submodules
    "portfolio_core_service",
    "portfolio_analytics_service",
    "portfolio_chart_service",
    "portfolio_user_service",
    "portfolio_watchlist_service",
    "helpers_stock",
    # User / Auth
    "get_me",
    "register_user",
    "login_user",
    # Core Portfolio
    "add_stock",
    "sell_stock",
    "show_portfolio",
    "portfolio_summary",
    "save_current_portfolio_value",
    # Chart & Analytics
    "get_protfolio_pie",
    "get_daily_change",
    "get_portfolio_history",
    "stock_analysis",
    "get_stock_details",
    # Watchlist
    "post_watchlist",
    "get_watchlist",
    # Transactions
    "transaction_log_history",
    # Helpers
    "sum_pl",
    "update_prices",
    "sum_daily_change",
]
