import yfinance_market as ym
import stock_charts as sc
import matplotlib.pyplot as plt
import stock_database as db 
import list_convert as lc
#make a pointer 
pdb = db.PortfolioDB() 



    
def add_stock (stock,shares,price_by):
#you need to enter the name of the stock the price that 1 stock worth and how many shers    
    stock = stock.upper()
    if ym.ticker_previousClose(stock) is None:
        return "The stock does not exist in the market"
    worth = price_by * shares
    save_line = pdb.get_portfolio_stock(stock)
    if save_line == None:
        pdb.insert_into_portfolio(stock,shares,price_by)
    else:
        sher_amount = save_line.shares + shares # תביא לי את ה-shares מתוך save_line
        avg_old = save_line.avg_price
        worth += save_line.cost_basis()
        avg_st = worth / sher_amount
        pdb.update_portfolio (sher_amount,avg_st,stock)   
    pdb.log_transaction(stock, "BUY", shares, price_by,0)
    pdb.conn.commit()
    return "success buy"

def sell_stock (stock,shares,sell_price) :
    #here you sell your stock and all the cases
    stock = stock.upper()
    worth = shares * sell_price
    checking = pdb.get_portfolio_stock(stock)
    if checking == None :
        return "the stock dont exist"
    else:
        avg_old = checking.avg_price
        sher_old = checking.shares
        if sher_old < shares :
            return "the action dont exist"
        realized_pl = checking.calculate_realized_pl (sell_price, shares)
        pdb.log_transaction(stock,"SELL",shares,sell_price,realized_pl)
        if sher_old == shares:
            pdb.delet_from_portfolio(stock)
            pdb.conn.commit()
            return "the stock has been deleted"
        else :
            new_share = sher_old - shares
            pdb.update_portfolio(new_share,avg_old,stock)
        pdb.conn.commit()
        return "the sell has been succesful"
    
def show_portfolio():
    # here you show all the stocks and you get live action also
    rows = pdb.select_all()
    if not rows:
        return "No stocks found"
    all_li = []
    # לולאה ראשונה - נתונים קבועים מה-SQL
    for row in rows:
        worth_st = row.cost_basis()  # שווי הקנייה המקורי
        info = update_prices(row.ticker, row.shares, row.avg_price)
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

 


def update_prices(ticker, shares, avg_price):
    #from here you take for the other function the live status
    shares = float(shares)
    avg_price = float(avg_price)
    worth_st = shares * avg_price
    prev_close_val = ym.ticker_previousClose(ticker)
    if prev_close_val is None :
        current_price = avg_price  # נניח שהמחיר לא השתנה כדי לא לשבור את החישוב
        previous_close = avg_price
    else :
        live_price = ym.ticker_last_price(ticker)
        
        # חגורת בטיחות: אם המחיר חזר ריק (None), נשתמש במחיר הסגירה הקודם כדי לא להתרסק
        current_price = live_price if live_price is not None else prev_close_val
        previous_close = prev_close_val
    stock_currnet_worth = current_price * shares
    prolos = stock_currnet_worth - worth_st
    precent_f_buy = (prolos / worth_st) * 100
    daily_change = (current_price - previous_close) * shares
    daily_precent = ((current_price - previous_close) / previous_close) * 100

    info = {
        "currnet_price": current_price,
        "stock_currnet_worth": stock_currnet_worth,
        "p/l": prolos,
        "precent_ch": precent_f_buy,
        "day_change": daily_change,
        "day_precent": daily_precent
    }
    return info
   
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
    
def sum_pl ():
    #it inside the show sunction it know
    #  how much profit you made
    pl_sum = pdb.total_profit_loss()
    if pl_sum is None or pl_sum[0] is None:
        return "you dont have any profit or loss"
    else:
        return float(pl_sum[0])

def plot_protfolio_pie():
    info_st = pdb.select_all()
    tickers = []
    values = []
    for stock in info_st :
        tickers.append(stock.ticker)
        info=update_prices(stock.ticker,stock.shares,stock.avg_price)
        values.append(info["stock_currnet_worth"])
    sc.plot_pie(values,tickers)

def plot_daily_change () :
    info_st = pdb.select_all()
    tickers = []
    daily_change = []
    colors_plt = []
    for stock in info_st :
        tickers.append(stock.ticker)
        info=update_prices(stock.ticker,stock.shares,stock.avg_price)
        daily_change.append(info["day_change"])
        if info["day_change"] > 0 :
            colors_plt.append("green")
        else :
            colors_plt.append("red")    
    sc.plot_daily_change(tickers, daily_change,colors_plt)

def save_current_portfolio_value():
    info_st = pdb.select_all()
    total_portfolio_worth =0 
    for stock in info_st :
        info=update_prices(stock.ticker,stock.shares,stock.avg_price)
        total_portfolio_worth += info["stock_currnet_worth"]
    pdb.insert_portfolio_history(total_portfolio_worth)

def plot_portfolio_history ():
    info_st = pdb.select_portfolio_history()
    date_times=[]
    portfolio_value = []
    for values,dates in info_st :
        portfolio_value.append(values)
        date_times.append(dates)
    sc.plot_history (date_times, portfolio_value)

def tansiction_log_history ():
    rows = pdb.log_history()
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

def portfolio_summary () :   
    return {
    "total_value": pdb.total_value() ,
    "total_profit": sum_pl() ,
    "daily_change": plot_daily_change(),
    "number_of_positions":pdb.number_of_positions()
}

print("הקוד רץ בהצלחה!")
# def show_portfolio():
#     # here you show all the stocks and you get live action also
#     rows = pdb.select_all()
#     if not rows:
#         print("Your portfolio is empty.")
#         return "No stocks found"
#     print("\n--- My Portfolio ---")
#     print("Stock | Shares | Total Worth | Avg Price")
#     print("----------------------------------------")
#     # לולאה ראשונה - נתונים קבועים מה-SQL
#     for row in rows:
#         worth_st = row.cost_basis()  # שווי הקנייה המקורי
#         print(f"{row.ticker} | {row.shares} | ${worth_st:.2f} | ${row.avg_price:.2f}")
    
#     print("\nStock | p/l | current_price | stock_current_worth | percent_ch | day_change | day_percent")
#     print("-----------------------------------------------------------------------------------------")
#     # לולאה שנייה - נתוני לייב מהאינטרנט
#     for row in rows:
#         # קוראים לפונקציה החדשה ומקבלים את מילון info עבור המניה הספציפית
#         info = update_prices(row.ticker, row.shares, row.avg_price)
    
#     # מדפיסים בעזרת המילון שחזר
#         print(f"{row.ticker} | ${info['p/l']:.2f} | ${info['currnet_price']:.2f} | ${info['stock_currnet_worth']:.2f} | %{info['precent_ch']:.2f} | ${info['day_change']:.2f} | %{info['day_precent']:.2f}")
#     print("----------------------------------------")
#     print (sum_pl())
    
#     return "thats all the stocks" 