# Facade for backward compatibility

from .portfolio_user_service import get_me, register_user, login_user
from .portfolio_core_service import (
    add_stock, sell_stock, show_portfolio, portfolio_summary, 
    get_portfolio_history, save_current_portfolio_value
)
from .transaction_service import transaction_log_history
from .portfolio_analytics_service import stock_analysis, get_stock_details
from .portfolio_watchlist_service import post_watchlist, get_watchlist
from .portfolio_chart_service import (
    get_protfolio_pie, get_daily_change, get_portfolio_history
)

__all__ = [
    "get_me", "register_user", "login_user",
    "add_stock", "sell_stock", "show_portfolio", "portfolio_summary",
    "get_portfolio_history", "save_current_portfolio_value",
    "transaction_log_history",
    "stock_analysis", "get_stock_details",
    "post_watchlist", "get_watchlist",
    "get_protfolio_pie", "get_daily_change"
]