import connectors.yfinance_market as ym
import connectors.helpers_stock as hp
import connectors.stock_charts as sc
from sqlalchemy.orm import Session
from classes import crud, schema as lc
from core import security

def get_me(db: Session, user_id: int):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        return None
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email
    }

def register_user(db: Session, username, password, email):
    if crud.get_user_by_username(db, username):
        return "Username already exists. Please choose a different username."
    else:
        password_hash = security.hash_password(password)
        crud.create_user(db, username, email, password_hash)
        return "User registered successfully."

def login_user(db: Session, username, password):
    user = crud.get_user_by_username(db, username)
    if user is None:
        return None
    if security.verify_password(user.password_hash, password):
        return user.user_id
    return None
        
def add_stock(db: Session, user_id: int, stock: str, shares: float, price_by: float):
    # you need to enter the name of the stock the price that 1 stock worth and how many shares    
    stock = stock.upper()
    if ym.ticker_previousClose(stock) is None:
        return "The stock does not exist in the market", None
    worth = price_by * shares
    save_line = crud.get_portfolio_stock(db, user_id, stock)
    if save_line is None:
        sector = ym.get_sector_from_yfinance(stock)
        crud.insert_portfolio(db, user_id, stock, shares, price_by, sector)
    else:
        sher_amount = float(save_line.shares) + shares
        worth += float(save_line.shares) * float(save_line.avg_price)
        avg_st = worth / sher_amount
        crud.update_portfolio(db, user_id, stock, sher_amount, avg_st)   
    crud.create_transaction(db, user_id, stock, "BUY", shares, price_by, 0.0)
    return "success buy"

def sell_stock(db: Session, user_id: int, stock: str, shares: float, sell_price: float):
    # here you sell your stock and all the cases
    stock = stock.upper()
    checking = crud.get_portfolio_stock(db, user_id, stock)
    if checking is None:
        return "the stock dont exist"
    else:
        avg_old = float(checking.avg_price)
        sher_old = float(checking.shares)
        if sher_old < shares:
            return "the action dont exist"
        realized_pl = (sell_price - avg_old) * shares
        crud.create_transaction(db, user_id, stock, "SELL", shares, sell_price, realized_pl)
        if sher_old == shares:
            crud.delete_portfolio_stock(db, user_id, stock)
            return "the stock has been deleted"
        else:
            new_share = sher_old - shares
            crud.update_portfolio(db, user_id, stock, new_share, avg_old)
        return "the sell has been succesful"
   
def stock_analysis(spec_stock: str):
    # here you analyze the stock and show you 1 month graph ago
    spec_stock = spec_stock.upper()
    try:
        market_cap, pe_st, expert_recommend, graf = ym.get_analysis_data(spec_stock)
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
    info_st = crud.get_portfolio_all(db, user_id)
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
    info_st = crud.get_portfolio_all(db, user_id)
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

def get_portfolio_history(db: Session, user_id: int):
    info_st = crud.get_portfolio_history(db, user_id)
    portfolio_history = []
    for item in info_st:
        portfolio_data = {
            "value": float(item.total_value), 
            "date": item.calculation_date
        }
        portfolio_history.append(portfolio_data)
    return portfolio_history   
        
def save_current_portfolio_value(db: Session, user_id: int):
    info_st = crud.get_portfolio_all(db, user_id)
    total_portfolio_worth = 0 
    for stock in info_st:
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        total_portfolio_worth += info["stock_currnet_worth"]
    crud.insert_portfolio_history(db, user_id, total_portfolio_worth)

def show_portfolio(db: Session, user_id: int):
    # here you show all the stocks and you get live action also
    rows = crud.get_portfolio_all(db, user_id)
    if not rows:
        return "No stocks found"
    all_li = []
    for row in rows:
        worth_st = float(row.shares) * float(row.avg_price)  # שווי הקנייה המקורי
        info = hp.update_prices(row.ticker, row.shares, row.avg_price)
        if info is None:
            continue
        all_dic = {
            "ticker": row.ticker,
            "shares": float(row.shares),
            "worth": worth_st,
            "avg_price": float(row.avg_price),
            "p/l": info['p/l'],
            "currnet_price": info['currnet_price'],
            "stock_currnet_worth": info['stock_currnet_worth'],
            "precent_ch": info['precent_ch'],
            "day_change": info['day_change'],
            "day_precent": info['day_precent']
        }
        all_li.append(all_dic)
    return all_li

def transaction_log_history(db: Session, user_id: int):
    rows = crud.get_transactions_history(db, user_id)
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

def portfolio_summary(db: Session, user_id: int):   
    return {
        "total_value": crud.get_portfolio_total_value(db, user_id),
        "total_profit": hp.sum_pl(db, user_id),
        "daily_change": hp.sum_daily_change(db, user_id),
        "number_of_positions": crud.get_portfolio_positions_count(db, user_id)
    }

def post_watchlist(db: Session, stock: str, user_id: int):
    if ym.ticker_previousClose(stock) is None:
        return "The stock does not exist in the market", None
    try:
        crud.create_watchlist_item(db, user_id, stock)
        return "success"
    except Exception:
        return "Stock is already in your watchlist"

def get_watchlist(db: Session, user_id: int): 
    items = crud.get_watchlist(db, user_id)
    return [item.ticker for item in items]

def get_stock_details(stock: str):
    stock = stock.upper()
    try:
        market_cap, pe_st, expert_recommend, graf = ym.get_analysis_data(stock)
        last_price = ym.ticker_last_price(stock)
        prev_close = ym.ticker_previousClose(stock)
        
        if last_price is None and prev_close is not None:
            last_price = prev_close
            
        change = 0.0
        change_percent = 0.0
        if last_price is not None and prev_close is not None:
            change = last_price - prev_close
            change_percent = (change / prev_close) * 100
            
        return {
            "ticker": stock,
            "market_cap": market_cap,
            "pe_ratio": pe_st,
            "recommendation": expert_recommend,
            "current_price": last_price,
            "previous_close": prev_close,
            "change": change,
            "change_percent": change_percent
        }
    except Exception as e:
        return {"error": str(e)}

def plot_protfolio_pie(db: Session, user_id: int):
    info_st = crud.get_portfolio_all(db, user_id)
    tickers = []
    values = []
    for stock in info_st:
        tickers.append(stock.ticker)
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        values.append(info["stock_currnet_worth"])
    sc.plot_pie(values, tickers)

def plot_daily_change(db: Session, user_id: int):
    info_st = crud.get_portfolio_all(db, user_id)
    tickers = []
    daily_change = []
    colors_plt = []
    for stock in info_st:
        tickers.append(stock.ticker)
        info = hp.update_prices(stock.ticker, stock.shares, stock.avg_price)
        daily_change.append(info["day_change"])
        if info["day_change"] > 0:
            colors_plt.append("green")
        else:
            colors_plt.append("red")    
    sc.plot_daily_change(tickers, daily_change, colors_plt)

def plot_portfolio_history(db: Session, user_id: int):
    info_st = crud.get_portfolio_history(db, user_id)
    date_times = []
    portfolio_value = []
    for item in info_st:
        portfolio_value.append(item.total_value)
        date_times.append(item.calculation_date)
    sc.plot_history(date_times, portfolio_value)