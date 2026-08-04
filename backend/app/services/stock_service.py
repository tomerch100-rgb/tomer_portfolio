import yfinance as yf
import os 
import asyncio
import logging
from dotenv import load_dotenv
from app.services.cache_service import get_cached_data, set_cached_data
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockSnapshotRequest
from alpaca.data.enums import DataFeed



load_dotenv()
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")


alpaca_client = StockHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)



async def get_prices_from_alpaca(stock: str):
    """
   in the same time the previous price and the last price before we call alpaca we check in redis if it is save 
    """
    if not alpaca_client:
        print("Error: Alpaca client is not initialized.")
        return None

    stock = stock.upper()
    cache_key = f"alpaca_price:{stock}"
    cached_prices = await get_cached_data(cache_key)

    if cached_prices :
        print(f"🎯 [CACHE HIT] Retrieved {stock} from Upstash Redis!")
        return cached_prices
    print(f"🌐 [CACHE MISS] Fetching {stock} from Alpaca API...")

    try:
        def _fetch():
            request_params = StockSnapshotRequest(symbol_or_symbols=stock, feed=DataFeed.IEX)
            return alpaca_client.get_stock_snapshot(request_params)
        snapshot = await asyncio.to_thread(_fetch)

        latest_price = snapshot[stock].latest_trade.price
        prev_close = snapshot[stock].previous_daily_bar.close
        
        result = {
            "lastPrice": snapshot[stock].latest_trade.price,
            "previousClose": snapshot[stock].previous_daily_bar.close
        }
        await set_cached_data(cache_key, result, ttl_seconds=300)
        return result

    except Exception as e:
        print(f"Error fetching {stock} from Alpaca: {e}")
        return None



async def get_analysis_data(stock):
    """
    מושך נתוני אנליזה מ-yfinance. שומר בקאש ל-24 שעות!
    """
    stock = stock.upper()
    cache_key = f"{stock}_ANALYSIS_V2"
    
    cached_data = await get_cached_data(cache_key)
    if cached_data:
        print(f"🎯 [CACHE HIT] Analysis for {stock}")
        return cached_data

    try:
        def _fetch_yf():
            ticker = yf.Ticker(stock)
            info = ticker.info or {}
            hist = ticker.history(period="1mo")
            hist = hist.reset_index()
            hist['Date'] = hist['Date'].astype(str)
            graph_dict = hist.to_dict(orient='records')
            return info, graph_dict
            
        info, graph_data = await asyncio.to_thread(_fetch_yf)
        
        analysis_pack = {
            "company_name": info.get("shortName") or info.get("longName") or stock,
            "exchange": info.get("exchange", "N/A"),
            "marketCap": info.get("marketCap"),
            "trailingPE": info.get("trailingPE"),
            "forwardPE": info.get("forwardPE"),
            "pegRatio": info.get("pegRatio"),
            "priceToBook": info.get("priceToBook"),
            "priceToSales": info.get("priceToSalesTrailing12Months"),
            "dividendYield": info.get("dividendYield"),
            "exDividendDate": info.get("exDividendDate"),
            "totalRevenue": info.get("totalRevenue"),
            "netIncome": info.get("netIncomeToCommon"),
            "profitMargins": info.get("profitMargins"),
            "operatingMargins": info.get("operatingMargins"),
            "returnOnEquity": info.get("returnOnEquity"),
            "returnOnAssets": info.get("returnOnAssets"),
            "debtToEquity": info.get("debtToEquity"),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow"),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh"),
            "targetHigh": info.get("targetHighPrice"),
            "targetLow": info.get("targetLowPrice"),
            "targetMean": info.get("targetMeanPrice"),
            "recommendationKey": info.get("recommendationKey", "N/A"),
            "recommendationMean": info.get("recommendationMean"),
            "graph_data": graph_data
        }
        
        await set_cached_data(cache_key, analysis_pack, ttl_seconds=86400)
        return analysis_pack
        
    except Exception as e:
        print(f"Error fetching analysis for {stock}: {e}")
        return {}
    

async def get_sector_from_yfinance(ticker: str):
    """
    מושך סקטור מ-yfinance. שומר בקאש ל-24 שעות.
    """
    ticker = ticker.upper()
    cache_key = f"{ticker}_SECTOR" 
    
    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data.get("sector")
        
    try:
        def _fetch_sector():
            stock_obj = yf.Ticker(ticker)
            return stock_obj.info.get('sector', 'Unknown')
            
        sector = await asyncio.to_thread(_fetch_sector)
        
        await set_cached_data(cache_key, {"sector": sector}, ttl_seconds=86400)
        return sector
        
    except Exception as e:
        print(f"Error fetching sector for {ticker}: {e}")
        return "Unknown"
    



# def ticker_previousClose(stock):
#     stock = stock.upper()
#     cached_data = cache.get_stock_data(stock) 
#     if cached_data is not None:
#         return cached_data.get("previousClose")
    
#     ticker_check = yf.Ticker(stock)
#     if ticker_check.fast_info is None or not ticker_check.fast_info:
#         return None
        
#     cache.set_cache_dic(stock, dict(ticker_check.fast_info))
#     return ticker_check.fast_info.get("previousClose")


# def ticker_last_price(stock):
#     stock = stock.upper()
#     cached_data = cache.get_stock_data(stock) 
#     if cached_data is not None:
#         return cached_data.get("lastPrice")

#     ticker_check = yf.Ticker(stock)
#     if ticker_check.fast_info is None or not ticker_check.fast_info:
#         return None
        
#     cache.set_cache_dic(stock, dict(ticker_check.fast_info))
#     return ticker_check.fast_info.get("lastPrice")
