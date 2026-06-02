import yfinance  as yf

def ticker_previousClose (stock) :
    ticker_check = yf.Ticker(stock)
    if ticker_check.fast_info is None or not ticker_check.fast_info:
        return None
    return ticker_check.fast_info.get("previousClose")

def ticker_last_price (stock):
    ticker_check = yf.Ticker(stock)
    if ticker_check.fast_info is None or not ticker_check.fast_info:
        return None
    return ticker_check.fast_info.get("lastPrice")

def get_analysis_data(stock):
    try:
        ticker = yf.Ticker(stock)
        info = ticker.info
        
        # שולפים את הנתונים מתוך ה-info שהורדנו
        market_cap = info.get("marketCap", "N/A")
        pe_st = info.get("trailingPE", "N/A") 
        expert_recommend = info.get("recommendationKey", "N/A")
        
        # מורידים את ההיסטוריה לגרף
        graph_data = ticker.history(period="1mo")
        
        return market_cap, pe_st, expert_recommend, graph_data
    except Exception:
        # אם יש שגיאה, מחזירים None לכולם
        return None, None, None, None