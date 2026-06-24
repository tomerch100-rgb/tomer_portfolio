import connectors.yfinance_market as ym
import connectors.helpers_stock as hp
import connectors.stock_charts as sc
import stock_database as db 
pdb = db.PortfolioDB() 


def get_me (user_id):
    result =  pdb.get_me_db (user_id)
    return result


def register_user(username, password, email):
    if pdb.user_exists(username):
        return "Username already exists. Please choose a different username."
    else:
        pdb.register_user(username, password, email)
        return "User registered successfully."

def login_user(username,password) :
    user_id = pdb.check_login_user(username,password)
    if user_id is not None:
        return user_id 
    else:
        return None
        
def add_stock (user_id,stock,shares,price_by):
#you need to enter the name of the stock the price that 1 stock worth and how many shers    
    stock = stock.upper()
    if ym.ticker_previousClose(stock) is None:
        return "The stock does not exist in the market", None
    worth = price_by * shares
    save_line = pdb.get_portfolio_stock(user_id,stock)
    if save_line == None:
        sector = ym.get_sector_from_yfinance(stock)
        pdb.insert_into_portfolio(user_id,stock,shares,price_by,sector)
    else:
        sher_amount = save_line.shares + shares # תביא לי את ה-shares מתוך save_line
        avg_old = save_line.avg_price
        worth += save_line.cost_basis()
        avg_st = worth / sher_amount
        pdb.update_portfolio (user_id,sher_amount,avg_st,stock)   
    pdb.log_transaction(user_id,stock, "BUY", shares, price_by,0)
    return "success buy"

def sell_stock (user_id,stock,shares,sell_price) :
    #here you sell your stock and all the cases
    stock = stock.upper()
    worth = shares * sell_price
    checking = pdb.get_portfolio_stock(user_id,stock)
    if checking == None :
        return "the stock dont exist"
    else:
        avg_old = checking.avg_price
        sher_old = checking.shares
        if sher_old < shares :
            return "the action dont exist"
        realized_pl = checking.calculate_realized_pl (sell_price, shares)
        pdb.log_transaction(user_id,stock,"SELL",shares,sell_price,realized_pl)
        if sher_old == shares:
            pdb.delet_from_portfolio(user_id,stock)
            return "the stock has been deleted"
        else :
            new_share = sher_old - shares
            pdb.update_portfolio(user_id,new_share,avg_old,stock)
        return "the sell has been succesful"
   
def stock_analysis (spec_stock):
    #here you anlyze the stock and show you 1 month graf ago
    spec_stock = spec_stock.upper()
    try :
        market_cap, pe_st, expert_recommend, graf = ym.get_analysis_data(spec_stock)
        if market_cap is None:
            return "The stock does not exist or there was an error fetching data."
        if not graf.empty:
            sc.month_graf(spec_stock,graf)
        else:
            return(f"Could not generate graph for {spec_stock} - No history available.")    

        return f"for the stock: {spec_stock}  market ca: {market_cap} the PE is: {pe_st} the expert recomendation: {expert_recommend}   "

    except Exception :
        return "The stock does not exist or there was an error fetching data."
    
def get_protfolio_pie(user_id):
    info_st = pdb.select_all(user_id)
    included_li = []
    for stock in info_st :
        info=hp.update_prices(stock.ticker,stock.shares,stock.avg_price)
        stock_data = {
            "ticker": stock.ticker,
            "value": info["stock_currnet_worth"]
        }
        included_li.append(stock_data)
    return included_li

def get_daily_change (user_id) :
    info_st = pdb.select_all(user_id)
    daily_change = []
    for stock in info_st :
        info=hp.update_prices(stock.ticker,stock.shares,stock.avg_price)
        stock_data = {
            "ticker": stock.ticker,
            "value": info["day_change"],
            "color" :"green" if info["day_change"] >= 0 else "red"
        }
        daily_change.append(stock_data)
    return daily_change    


def get_portfolio_history (user_id):
    info_st = pdb.select_portfolio_history(user_id)
    portfolio_history = []
    for value,dates in info_st :
       portfolio_data =  {
            "value" : value , 
            "date" : dates
        }
       portfolio_history.append(portfolio_data)
    return portfolio_history   

        
def save_current_portfolio_value(user_id):
    info_st = pdb.select_all(user_id)
    total_portfolio_worth =0 
    for stock in info_st :

        info=hp.update_prices(stock.ticker,stock.shares,stock.avg_price)
        total_portfolio_worth += info["stock_currnet_worth"]
    pdb.insert_portfolio_history(user_id,total_portfolio_worth)

def show_portfolio(user_id):
    # here you show all the stocks and you get live action also
    rows = pdb.select_all(user_id)
    if not rows:
        return "No stocks found"
    all_li = []
    # לולאה ראשונה - נתונים קבועים מה-SQL
    for row in rows:
        worth_st = row.cost_basis()  # שווי הקנייה המקורי
        info = hp.update_prices(row.ticker, row.shares, row.avg_price)
        if info is None:
            continue
        all_dic = {"ticker":row.ticker ,"shares":row.shares ,"worth":worth_st,
                   "avg_price":row.avg_price,"p/l":info['p/l'],
                   "currnet_price":info['currnet_price'],
                   "stock_currnet_worth":info['stock_currnet_worth'],
                   "precent_ch":info['precent_ch'],
                   "day_change":info['day_change'],
                   "day_precent":info['day_precent']
                   }
        all_li.append(all_dic)
    # מדפיסים בעזרת המילון שחזר
    return all_li


def transaction_log_history (user_id):
    rows = pdb.log_history(user_id)
    row_list = []
    for row in rows : 
        
           row_list.append( {  "ticker": row.ticker,
            "action_type": row.action_type,
            "shares": row.shares,
            "price": row.price,
            "realized_pl": row.realized_pl,
            "transaction_date": str(row.transaction_date)
           } )
    return row_list

def portfolio_summary (user_id) :   
    return {
    "total_value": pdb.total_value(user_id) ,
    "total_profit": hp.sum_pl(user_id) ,
    "daily_change": hp.sum_daily_change(user_id),
    "number_of_positions":pdb.number_of_positions(user_id)

}


def post_watchlist (stock,user_id ):
    if ym.ticker_previousClose(stock) is None:
        return "The stock does not exist in the market", None
    try:
        pdb.post_watchlist_db(user_id,stock)
        return "success"
    except Exception :
        return "Stock is already in your watchlist"

def get_watchlist ( user_id) : 
    personal_li = pdb.get_watchlist_db(user_id)
    if personal_li is None :
        return []
    return personal_li







def plot_protfolio_pie(user_id):
    info_st = pdb.select_all(user_id)
    tickers = []
    values = []
    for stock in info_st :
        tickers.append(stock.ticker)
        info=hp.update_prices(stock.ticker,stock.shares,stock.avg_price)
        values.append(info["stock_currnet_worth"])
    sc.plot_pie(values,tickers)

def plot_daily_change (user_id) :
    info_st = pdb.select_all(user_id)
    tickers = []
    daily_change = []
    colors_plt = []
    for stock in info_st :
        tickers.append(stock.ticker)
        info=hp.update_prices(stock.ticker,stock.shares,stock.avg_price)
        daily_change.append(info["day_change"])
        if info["day_change"] > 0 :
            colors_plt.append("green")
        else :
            colors_plt.append("red")    
    sc.plot_daily_change(tickers, daily_change,colors_plt)

def plot_portfolio_history (user_id):
    info_st = pdb.select_portfolio_history(user_id)
    date_times=[]
    portfolio_value = []
    for values,dates in info_st :
        portfolio_value.append(values)
        date_times.append(dates)
    sc.plot_history (date_times, portfolio_value)