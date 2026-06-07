import yfinance_market as ym
import stock_database as db 
pdb = db.PortfolioDB() 


def sum_pl (user_id):
    #it inside the show sunction it know
    #  how much profit you made
    pl_sum = pdb.total_profit_loss(user_id)
    if pl_sum is None or pl_sum[0] is None:
        return "you dont have any profit or loss"
    else:
        return float(pl_sum[0])
    

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


def sum_daily_change (user_id) :
    info_st = pdb.select_all(user_id)
    daily_change = []
    for stock in info_st :
        info=update_prices(stock.ticker,stock.shares,stock.avg_price)
        daily_change.append(info["day_change"])
    return sum (daily_change)