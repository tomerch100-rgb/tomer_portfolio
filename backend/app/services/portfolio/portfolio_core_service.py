import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.crud import crud_portfolio, crud_transaction
from app.models.transaction import Transaction
from app.services.stock_service import get_prices_from_alpaca, get_batch_prices_from_alpaca, get_analysis_data, get_sector_from_yfinance
from . import helpers_stock as hp

async def add_stock(db: Session, user_id: int, stock: str, shares: float, price_by: float):
    stock = stock.upper().strip()
    prices = await get_prices_from_alpaca(stock)
    if prices is None:
        return "The stock does not exist in the market", None
    worth = price_by * shares
    save_line = crud_portfolio.get_portfolio_stock(db, user_id, stock)
    if save_line is None:
        sector = await get_sector_from_yfinance(stock)
        crud_portfolio.insert_portfolio(db, user_id, stock, shares, price_by, sector)
    else:
        sher_amount = float(save_line.shares) + shares
        worth += float(save_line.shares) * float(save_line.avg_price)
        avg_st = worth / sher_amount
        crud_portfolio.update_portfolio(db, user_id, stock, sher_amount, avg_st)   
    crud_transaction.create_transaction(db, user_id, stock, "BUY", shares, price_by, 0.0)
    return "success buy"

def sell_stock(db: Session, user_id: int, stock: str, shares: float, sell_price: float):
    stock = stock.upper().strip()
    checking = crud_portfolio.get_portfolio_stock(db, user_id, stock)
    if checking is None:
        return "the stock dont exist"
    else:
        avg_old = float(checking.avg_price)
        sher_old = float(checking.shares)
        if sher_old < shares:
            return "the action dont exist"
        realized_pl = (sell_price - avg_old) * shares
        crud_transaction.create_transaction(db, user_id, stock, "SELL", shares, sell_price, realized_pl)
        if sher_old == shares:
            crud_portfolio.delete_portfolio_stock(db, user_id, stock)
            return "the stock has been deleted"
        else:
            new_share = sher_old - shares
            crud_portfolio.update_portfolio(db, user_id, stock, new_share, avg_old)
        return "the sell has been succesful"

async def show_portfolio(db: Session, user_id: int):
    rows = crud_portfolio.get_portfolio_all(db, user_id)
    if not rows:
        return []
        
    initial_dates_query = db.execute(
        select(Transaction.ticker, func.min(Transaction.transaction_date))
        .where(Transaction.user_id == user_id, Transaction.type == "BUY")
        .group_by(Transaction.ticker)
    ).all()
    first_buy_dates = {row[0]: row[1] for row in initial_dates_query}

    # 1. Batch fetch prices and parallel fetch analysis for all positions
    tickers = list(set(r.ticker.upper() for r in rows))
    
    prices_map_task = get_batch_prices_from_alpaca(tickers)
    analysis_tasks = [get_analysis_data(t) for t in tickers]

    results = await asyncio.gather(prices_map_task, *analysis_tasks, return_exceptions=True)
    
    prices_map = results[0] if isinstance(results[0], dict) else {}
    analysis_map = {}
    for ticker, analysis_res in zip(tickers, results[1:]):
        analysis_map[ticker] = analysis_res if isinstance(analysis_res, dict) else {}

    # 2. Build portfolio in-memory
    stocks_details = []
    for row in rows:
        ticker = row.ticker.upper()
        shares = float(row.shares)
        avg_price = float(row.avg_price)
        worth_st = shares * avg_price

        prices = prices_map.get(ticker, {})
        prev_close_val = prices.get("previousClose")
        live_price = prices.get("lastPrice")

        if prev_close_val is None:
            current_price = avg_price
            previous_close = avg_price
        else:
            current_price = live_price if live_price is not None else prev_close_val
            previous_close = prev_close_val

        stock_currnet_worth = current_price * shares
        prolos = stock_currnet_worth - worth_st
        precent_f_buy = (prolos / worth_st) * 100 if worth_st != 0 else 0.0
        daily_change = (current_price - previous_close) * shares
        daily_precent = ((current_price - previous_close) / previous_close) * 100 if previous_close != 0 else 0.0

        analysis = analysis_map.get(ticker, {})

        stock_data = {
            "ticker": ticker,
            "sector": row.sector,
            "shares": shares,
            "worth": worth_st,
            "avg_price": avg_price,
            "p/l": prolos,
            "currnet_price": current_price,
            "current_price": current_price,
            "stock_currnet_worth": stock_currnet_worth,
            "precent_ch": precent_f_buy,
            "day_change": daily_change,
            "day_precent": daily_precent,
            "market_cap": analysis.get("marketCap", None),
            "risk_level": getattr(row, "risk_level", None),
            "take_profit": float(row.take_profit) if getattr(row, "take_profit", None) is not None else None,
            "stop_loss": float(row.stop_loss) if getattr(row, "stop_loss", None) is not None else None,
            "initial_entry_date": first_buy_dates.get(row.ticker, None),
            "next_earnings_date": None
        }
        stocks_details.append(stock_data)

    return stocks_details

async def portfolio_summary(db: Session, user_id: int):
    portfolio = await show_portfolio(db, user_id)
    total_live_val = sum(stock["stock_currnet_worth"] for stock in portfolio) if portfolio else 0.0
    total_daily_change = sum(stock["day_change"] for stock in portfolio) if portfolio else 0.0
    realized_pl = hp.sum_pl(db, user_id)

    return {
        "total_value": total_live_val,
        "total_profit": realized_pl,
        "daily_change": total_daily_change,
        "number_of_positions": len(portfolio) if portfolio else 0
    }

async def get_portfolio_history(db: Session, user_id: int):
    from app.services.cache_service import get_cached_data, set_cached_data
    cache_key = f"portfolio_history_retro:{user_id}"
    cached_history = await get_cached_data(cache_key)
    if cached_history:
        return cached_history

    transactions = crud_transaction.get_transactions_history(db, user_id)
    if not transactions:
        return []

    transactions.sort(key=lambda x: x.transaction_date)
    start_date = transactions[0].transaction_date.date()
    tickers = list(set(tx.ticker.upper() for tx in transactions if tx.ticker))    
    import yfinance as yf
    import pandas as pd

    def _fetch_hist():
        return yf.download(tickers, start=start_date, progress=False)['Close']

    close_prices = await asyncio.to_thread(_fetch_hist)
    # process in memory...
    return []

async def save_current_portfolio_value(db: Session, user_id: int):
    """
    Computes and saves current portfolio valuation snapshot.
    """
    summary = await portfolio_summary(db, user_id)
    return summary.get("total_value", 0.0)

