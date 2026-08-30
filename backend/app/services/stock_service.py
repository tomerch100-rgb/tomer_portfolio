import asyncio
import logging
import os

import yfinance as yf
from alpaca.data.enums import DataFeed
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockSnapshotRequest
from app.services.cache_service import get_cached_data, set_cached_data
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")

alpaca_client = None
if ALPACA_API_KEY and ALPACA_SECRET_KEY:
    try:
        alpaca_client = StockHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Alpaca client: {e}")


async def get_batch_prices_from_alpaca(stocks: list[str]) -> dict[str, dict]:
    """
    High-performance batch price resolver:
    1. Checks cache for all requested symbols concurrently.
    2. Sends a single batched request to Alpaca for all cache misses.
    3. Caches retrieved results and returns a mapping: { ticker: { lastPrice, previousClose, volume } }
    """
    if not stocks:
        return {}

    cleaned_stocks = list(set(s.strip().upper() for s in stocks if s and s.strip()))
    if not cleaned_stocks:
        return {}

    results = {}
    missing_stocks = []

    # 1. Concurrently check cache for all stocks
    cache_lookups = await asyncio.gather(
        *[get_cached_data(f"alpaca_price:{s}") for s in cleaned_stocks], return_exceptions=True
    )

    for stock, cached in zip(cleaned_stocks, cache_lookups):
        if isinstance(cached, dict) and cached.get("previousClose") is not None:
            results[stock] = cached
        else:
            missing_stocks.append(stock)

    if not missing_stocks:
        return results

    if not alpaca_client:
        logger.warning("Alpaca client is not initialized.")
        return results

    # 2. Fetch all missing stocks in a SINGLE batch call to Alpaca
    try:

        def _fetch_batch():
            request_params = StockSnapshotRequest(symbol_or_symbols=missing_stocks, feed=DataFeed.IEX)
            return alpaca_client.get_stock_snapshot(request_params)

        snapshots = await asyncio.to_thread(_fetch_batch)

        cache_set_tasks = []
        for stock in missing_stocks:
            if stock in snapshots:
                snap = snapshots[stock]
                latest_price = snap.latest_trade.price if snap.latest_trade else None
                prev_close = snap.previous_daily_bar.close if snap.previous_daily_bar else None
                volume = None
                if hasattr(snap, "daily_bar") and snap.daily_bar:
                    volume = snap.daily_bar.volume
                elif hasattr(snap, "previous_daily_bar") and snap.previous_daily_bar:
                    volume = snap.previous_daily_bar.volume

                price_data = {"lastPrice": latest_price, "previousClose": prev_close, "volume": volume}
                results[stock] = price_data
                cache_set_tasks.append(set_cached_data(f"alpaca_price:{stock}", price_data, ttl_seconds=300))

        if cache_set_tasks:
            await asyncio.gather(*cache_set_tasks, return_exceptions=True)

    except Exception as e:
        logger.warning(f"Batch fetch from Alpaca had partial or total error: {e}. Falling back per-symbol.")

        # Fallback to individual requests if batch fails due to a single invalid symbol
        async def _fetch_single(sym):
            try:

                def _fetch_one():
                    req = StockSnapshotRequest(symbol_or_symbols=sym, feed=DataFeed.IEX)
                    return alpaca_client.get_stock_snapshot(req)

                one_snap = await asyncio.to_thread(_fetch_one)
                if sym in one_snap:
                    s = one_snap[sym]
                    lp = s.latest_trade.price if s.latest_trade else None
                    pc = s.previous_daily_bar.close if s.previous_daily_bar else None
                    vol = s.daily_bar.volume if hasattr(s, "daily_bar") and s.daily_bar else None
                    res = {"lastPrice": lp, "previousClose": pc, "volume": vol}
                    await set_cached_data(f"alpaca_price:{sym}", res, ttl_seconds=300)
                    return sym, res
            except Exception:
                pass
            return sym, None

        fallback_results = await asyncio.gather(*[_fetch_single(s) for s in missing_stocks])
        for sym, res in fallback_results:
            if res:
                results[sym] = res

    return results


async def get_prices_from_alpaca(stock: str):
    """
    Single price fetcher utilizing the batch pipeline and two-tier cache.
    """
    if not stock:
        return None
    stock = stock.upper().strip()
    batch = await get_batch_prices_from_alpaca([stock])
    return batch.get(stock)


async def get_analysis_data(stock: str):
    """
    Fetches fundamental analysis data from yfinance with non-blocking execution and 24h caching.
    """
    stock = stock.upper().strip()
    cache_key = f"{stock}_ANALYSIS_V2"

    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data

    try:

        def _fetch_yf():
            ticker = yf.Ticker(stock)
            info = ticker.info or {}
            hist = ticker.history(period="1mo")
            hist = hist.reset_index()
            hist["Date"] = hist["Date"].astype(str)
            graph_dict = hist.to_dict(orient="records")
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
            "graph_data": graph_data,
        }

        await set_cached_data(cache_key, analysis_pack, ttl_seconds=86400)
        return analysis_pack

    except Exception as e:
        logger.warning(f"Error fetching analysis for {stock}: {e}")
        return {}


async def get_sector_from_yfinance(ticker: str):
    """
    Fetches stock sector from yfinance with non-blocking execution and 24h caching.
    """
    ticker = ticker.upper().strip()
    cache_key = f"{ticker}_SECTOR"

    cached_data = await get_cached_data(cache_key)
    if cached_data:
        return cached_data

    try:

        def _fetch_sector():
            stock_obj = yf.Ticker(ticker)
            return stock_obj.info.get("sector", "Unknown")

        sector = await asyncio.to_thread(_fetch_sector)
        await set_cached_data(cache_key, sector, ttl_seconds=86400)
        return sector

    except Exception as e:
        logger.warning(f"Error fetching sector for {ticker}: {e}")
        return "Unknown"
