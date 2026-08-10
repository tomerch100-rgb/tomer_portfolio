from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.crud import crud_portfolio, crud_transaction
from app.models.transaction import Transaction
from app.services.stock_service import get_prices_from_alpaca, get_analysis_data, get_sector_from_yfinance
import app.services.helpers_stock as hp

async def add_stock(db: Session, user_id: int, stock: str, shares: float, price_by: float):
    # you need to enter the name of the stock the price that 1 stock worth and how many shares    
    stock = stock.upper()
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
    # here you sell your stock and all the cases
    stock = stock.upper()
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
    # you take all the portfolio of the user 
    rows = crud_portfolio.get_portfolio_all(db, user_id)
    if not rows:
        return []
        
    initial_dates_query = db.execute(
        select(Transaction.ticker, func.min(Transaction.transaction_date))
        .where(Transaction.user_id == user_id, Transaction.type == "BUY")
        .group_by(Transaction.ticker)
    ).all()
    first_buy_dates = {row[0]: row[1] for row in initial_dates_query}
        
    stocks_details = []
    for row in rows:
        shares = float(row.shares)
        avg_price = float(row.avg_price)
        worth_st = shares * avg_price
        info = await hp.update_prices(row.ticker, row.shares, row.avg_price)
        if info is None:
            continue
            
        analysis = await get_analysis_data(row.ticker) or {}
            
        stock_data = {
            "ticker": row.ticker,
            "sector": row.sector,
            "shares": shares,
            "worth": worth_st,
            "avg_price": avg_price,
            "p/l": info['p/l'],
            "currnet_price": info['currnet_price'],
            "current_price": info['currnet_price'],
            "stock_currnet_worth": info['stock_currnet_worth'],
            "precent_ch": info['precent_ch'],
            "day_change": info['day_change'],
            "day_precent": info['day_precent'],
            "market_cap": analysis.get("marketCap", None),
            "risk_level": getattr(row, "risk_level", None),
            "take_profit": float(row.take_profit) if getattr(row, "take_profit", None) is not None else None,
            "stop_loss": float(row.stop_loss) if getattr(row, "stop_loss", None) is not None else None,
            "initial_entry_date": first_buy_dates.get(row.ticker, None),
            "next_earnings_date": None # yfinance does not reliably provide next earnings date in info, set to None as requested
        }
        stocks_details.append(stock_data)
    return stocks_details

async def portfolio_summary(db: Session, user_id: int):
    portfolio = await show_portfolio(db, user_id)
    total_live_val = sum(stock["stock_currnet_worth"] for stock in portfolio) if portfolio else 0.0
    return {
        "total_value": total_live_val,
        "total_profit": hp.sum_pl(db, user_id),
        "daily_change": await hp.sum_daily_change(db, user_id),
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
    from datetime import date, timedelta
    
    today = date.today()
    try:
        data = yf.download(tickers, start=start_date, end=today + timedelta(days=1))
        if 'Close' not in data:
            return []
            
        close_data = pd.DataFrame(data['Close'])
        if len(tickers) == 1:
            close_data.columns = tickers
        close_data = close_data.ffill()
    except Exception as e:
        print(f"Error fetching historical data: {e}")
        return []

    date_range = pd.date_range(start=start_date, end=today, freq='D')
    current_shares = {ticker: 0.0 for ticker in tickers}
    tx_idx = 0
    num_tx = len(transactions)
    portfolio_history = []

    for current_date in date_range:
        current_date_date = current_date.date()
        while tx_idx < num_tx and transactions[tx_idx].transaction_date.date() <= current_date_date:
            tx = transactions[tx_idx]
            if tx.type == "BUY":
                current_shares[tx.ticker.upper()] += float(tx.shares)
            elif tx.type == "SELL":
                current_shares[tx.ticker.upper()] -= float(tx.shares)
            tx_idx += 1
            
        daily_val = 0.0
        for ticker in tickers:
            shares = current_shares[ticker]
            if shares > 0:
                try:
                    idx = close_data.index.get_indexer([current_date], method='ffill')[0]
                    if idx >= 0:
                        price = float(close_data[ticker].iloc[idx])
                        if not pd.isna(price):
                            daily_val += shares * price
                except Exception:
                    pass
                    
        portfolio_history.append({
            "date": str(current_date_date),
            "value": round(daily_val, 2)
        })
        
    await set_cached_data(cache_key, portfolio_history, ttl_seconds=3600)
    return portfolio_history   
        
def save_current_portfolio_value(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    total_portfolio_worth = 0 
    for stock in info_st:
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        total_portfolio_worth += info["stock_currnet_worth"]
    crud_portfolio.insert_portfolio_history(db, user_id, total_portfolio_worth)
