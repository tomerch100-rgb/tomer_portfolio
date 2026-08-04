from app.services.stock_service import get_prices_from_alpaca
from sqlalchemy.orm import Session
from app.crud import crud_transaction, crud_portfolio

def sum_pl(db: Session, user_id: int):
    # it inside the show function it knows how much profit you made
    pl_val = crud_transaction.get_transactions_sum_realized_pl(db, user_id)
    if pl_val == 0.0:
        # Check if there are actually any transactions at all, if not return legacy string
        txs = crud_transaction.get_transactions_history(db, user_id)
        if not txs:
            return "you dont have any profit or loss"
    return float(pl_val)

async def update_prices(ticker: str, shares: float, avg_price: float):
    # from here you take for the other function the live status
    shares = float(shares)
    avg_price = float(avg_price)
    worth_st = shares * avg_price
    prices = await get_prices_from_alpaca(ticker)
    if prices is None or prices.get("previousClose") is None:
        current_price = avg_price  # Default if unchanged
        previous_close = avg_price
    else:
        prev_close_val = prices["previousClose"]
        live_price = prices.get("lastPrice")
        current_price = live_price if live_price is not None else prev_close_val
        previous_close = prev_close_val
    stock_currnet_worth = current_price * shares
    prolos = stock_currnet_worth - worth_st
    precent_f_buy = (prolos / worth_st) * 100 if worth_st != 0 else 0.0
    daily_change = (current_price - previous_close) * shares
    daily_precent = ((current_price - previous_close) / previous_close) * 100 if previous_close != 0 else 0.0

    info = {
        "currnet_price": current_price,
        "stock_currnet_worth": stock_currnet_worth,
        "p/l": prolos,
        "precent_ch": precent_f_buy,
        "day_change": daily_change,
        "day_precent": daily_precent
    }
    return info    

async def sum_daily_change(db: Session, user_id: int) -> float:
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    daily_change = []
    for stock in info_st :
        info = await update_prices(stock.ticker, stock.shares, stock.avg_price)
        daily_change.append(info["day_change"])
    return sum(daily_change)