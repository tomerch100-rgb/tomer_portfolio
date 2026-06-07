import yfinance as yf
import stock_cache as cache

def ticker_previousClose(stock):
    stock = stock.upper()
    cached_data = cache.get_stock_data(stock) # מפתח רגיל ל-fast_info
    if cached_data is not None:
        return cached_data.get("previousClose")
    
    ticker_check = yf.Ticker(stock)
    if ticker_check.fast_info is None or not ticker_check.fast_info:
        return None
        
    cache.set_cache_dic(stock, dict(ticker_check.fast_info))
    return ticker_check.fast_info.get("previousClose")


def ticker_last_price(stock):
    stock = stock.upper()
    cached_data = cache.get_stock_data(stock) # מפתח רגיל ל-fast_info
    if cached_data is not None:
        return cached_data.get("lastPrice")

    ticker_check = yf.Ticker(stock)
    if ticker_check.fast_info is None or not ticker_check.fast_info:
        return None
        
    cache.set_cache_dic(stock, dict(ticker_check.fast_info))
    return ticker_check.fast_info.get("lastPrice")


def get_analysis_data(stock):
    stock = stock.upper()
    cache_key = f"{stock}_ANALYSIS" # מפתח נפרד! שלא יתערבב עם המחירים
    
    cached_data = cache.get_stock_data(cache_key)
    if cached_data is not None:
        # כאן הכל נשלף בצורה מושלמת מהמילון המותאם ששמרנו
        return (cached_data.get("marketCap"),
                cached_data.get("trailingPE"),
                cached_data.get("recommendationKey"),
                cached_data.get("graph_data"))
    try:
        ticker = yf.Ticker(stock)
        info = ticker.info
        
        market_cap = info.get("marketCap", "N/A")
        pe_st = info.get("trailingPE", "N/A") 
        expert_recommend = info.get("recommendationKey", "N/A")
        graph_data = ticker.history(period="1mo")
        
        # מייצרים מילון מותאם אישית שכולל בתוכו גם את ה-info וגם את הגרף!
        analysis_pack = {
            "marketCap": market_cap,
            "trailingPE": pe_st,
            "recommendationKey": expert_recommend,
            "graph_data": graph_data  # עכשיו הגרף נשמר בקאש!
        }
        cache.set_cache_dic(cache_key, analysis_pack)
        
        return market_cap, pe_st, expert_recommend, graph_data
    except Exception:
        return None, None, None, None
    

def get_sector_from_yfinance(ticker):
    ticker = ticker.upper()
    cache_key = f"{ticker}_SECTOR" # מפתח נפרד לסקטור
    
    cached_data = cache.get_stock_data(cache_key)
    if cached_data is not None:
        return cached_data.get("sector")
    try:
        stock_obj = yf.Ticker(ticker)
        sector = stock_obj.info.get('sector', 'Unknown')
        
        # שומרים בקאש מילון קטן שמכיל את הסקטור
        cache.set_cache_dic(cache_key, {"sector": sector})
        return sector
    except Exception as e:
        return "Unknown"
    


