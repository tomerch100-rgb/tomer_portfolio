from app.services.stock_service import get_prices_from_alpaca, get_analysis_data, get_sector_from_yfinance
import app.services.helpers_stock as hp
import app.services.stock_charts as sc
from sqlalchemy.orm import Session
from app.crud import crud_user, crud_portfolio, crud_transaction, crud_watchlist
from app.core import security

def get_me(db: Session, user_id: int):
    user = crud_user.get_user_by_id(db, user_id)
    if not user:
        return None
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email
    }

def register_user(db: Session, username, password, email):
    if crud_user.get_user_by_username(db, username):
        return "Username already exists. Please choose a different username."
    else:
        password_hash = security.hash_password(password)
        crud_user.create_user(db, username, email, password_hash)
        return "User registered successfully."

def login_user(db: Session, username, password):
    user = crud_user.get_user_by_username(db, username)
    if user is None:
        return None
    if security.verify_password(user.password_hash, password):
        return user.user_id
    return None
        
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
   
async def stock_analysis(spec_stock: str):
    # here you analyze the stock and show you 1 month graph ago
    spec_stock = spec_stock.upper()
    try:
        market_cap, pe_st, expert_recommend, graf = await get_analysis_data(spec_stock)
        if market_cap is None:
            return "The stock does not exist or there was an error fetching data."
        if not graf.empty:
            sc.month_graf(spec_stock, graf)
        else:
            return f"Could not generate graph for {spec_stock} - No history available."    

        return f"for the stock: {spec_stock}  market ca: {market_cap} the PE is: {pe_st} the expert recomendation: {expert_recommend}   "

    except Exception:
        return "The stock does not exist or there was an error fetching data."
    
def get_protfolio_pie(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    included_li = []
    for stock in info_st:
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        stock_data = {
            "ticker": stock.ticker,
            "value": info["stock_currnet_worth"]
        }
        included_li.append(stock_data)
    return included_li

def get_daily_change(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    daily_change = []
    for stock in info_st:
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        stock_data = {
            "ticker": stock.ticker,
            "value": info["day_change"],
            "color": "green" if info["day_change"] >= 0 else "red"
        }
        daily_change.append(stock_data)
    return daily_change    

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
    tickers = list(set(tx.ticker.upper() for tx in transactions))
    
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

async def show_portfolio(db: Session, user_id: int):
    from sqlalchemy import select, func
    from app.models.transaction import Transaction
    
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

def transaction_log_history(db: Session, user_id: int):
    rows = crud_transaction.get_transactions_history(db, user_id)
    row_list = []
    for row in rows: 
        row_list.append({
            "ticker": row.ticker,
            "action_type": row.type,
            "shares": float(row.shares),
            "price": float(row.price),
            "realized_pl": float(row.realized_pl),
            "transaction_date": str(row.transaction_date)
        })
    return row_list

async def portfolio_summary(db: Session, user_id: int):
    portfolio = await show_portfolio(db, user_id)
    total_live_val = sum(stock["stock_currnet_worth"] for stock in portfolio) if portfolio else 0.0
    return {
        "total_value": total_live_val,
        "total_profit": hp.sum_pl(db, user_id),
        "daily_change": await hp.sum_daily_change(db, user_id),
        "number_of_positions": len(portfolio) if portfolio else 0
    }

async def post_watchlist(db: Session, stock: str, user_id: int):
    prices = await get_prices_from_alpaca(stock)
    if prices is None:
        return "The stock does not exist in the market", None
    try:
        crud_watchlist.create_watchlist_item(db, user_id, stock)
        return "success"
    except Exception:
        return "Stock is already in your watchlist"

async def get_watchlist(db: Session, user_id: int): 
    items = crud_watchlist.get_watchlist(db, user_id)
    result = []
    for item in items:
        ticker = item.ticker.upper()
        prices = await get_prices_from_alpaca(ticker)
        last_price = prices.get("lastPrice") if prices else None
        prev_close = prices.get("previousClose") if prices else None
        change = 0.0
        change_percent = 0.0
        if last_price is not None and prev_close is not None and prev_close != 0:
            change = last_price - prev_close
            change_percent = (change / prev_close) * 100
        result.append({
            "ticker": ticker,
            "current_price": last_price,
            "previous_close": prev_close,
            "change": change,
            "change_percent": change_percent
        })
    return result

async def get_stock_details(stock: str):
    stock = stock.upper()
    try:
        analysis = await get_analysis_data(stock) or {}
        prices = await get_prices_from_alpaca(stock)
        if prices:
            last_price = prices.get("lastPrice")
            prev_close = prices.get("previousClose")
        else:
            last_price = None
            prev_close = None
        
        if last_price is None and prev_close is not None:
            last_price = prev_close
            
        change = 0.0
        change_percent = 0.0
        if last_price is not None and prev_close is not None and prev_close != 0:
            change = last_price - prev_close
            change_percent = (change / prev_close) * 100
            
        return {
            "ticker": stock,
            "company_name": analysis.get("company_name", stock),
            "exchange": analysis.get("exchange", "N/A"),
            "current_price": last_price,
            "previous_close": prev_close,
            "change": change,
            "change_percent": change_percent,
            "market_cap": analysis.get("marketCap"),
            "pe_ratio": analysis.get("trailingPE"),
            "forward_pe": analysis.get("forwardPE"),
            "peg_ratio": analysis.get("pegRatio"),
            "price_to_book": analysis.get("priceToBook"),
            "price_to_sales": analysis.get("priceToSales"),
            "dividend_yield": analysis.get("dividendYield"),
            "ex_dividend_date": analysis.get("exDividendDate"),
            "total_revenue": analysis.get("totalRevenue"),
            "net_income": analysis.get("netIncome"),
            "profit_margins": analysis.get("profitMargins"),
            "operating_margins": analysis.get("operatingMargins"),
            "return_on_equity": analysis.get("returnOnEquity"),
            "return_on_assets": analysis.get("returnOnAssets"),
            "debt_to_equity": analysis.get("debtToEquity"),
            "fifty_two_week_low": analysis.get("fiftyTwoWeekLow"),
            "fifty_two_week_high": analysis.get("fiftyTwoWeekHigh"),
            "target_high": analysis.get("targetHigh"),
            "target_low": analysis.get("targetLow"),
            "target_mean": analysis.get("targetMean"),
            "recommendation": analysis.get("recommendationKey", "N/A"),
            "recommendation_mean": analysis.get("recommendationMean"),
            "graph_data": analysis.get("graph_data", [])
        }
    except Exception as e:
        return {"error": str(e)}

async def plot_protfolio_pie(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    tickers = []
    values = []
    for stock in info_st:
        tickers.append(stock.ticker)
        info = await hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        values.append(info["stock_currnet_worth"])
    sc.plot_pie(values, tickers)

async def plot_daily_change(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_all(db, user_id)
    tickers = []
    daily_change = []
    colors_plt = []
    for stock in info_st:
        tickers.append(stock.ticker)
        info = await hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        daily_change.append(info["day_change"])
        if info["day_change"] > 0:
            colors_plt.append("green")
        else:
            colors_plt.append("red")    
    sc.plot_daily_change(tickers, daily_change, colors_plt)

def plot_portfolio_history(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_history(db, user_id)
    date_times = []
    portfolio_value = []
    for item in info_st:
        portfolio_value.append(item.total_value)
        date_times.append(item.calculation_date)
    sc.plot_history(date_times, portfolio_value)