import asyncio
from app.services.stock_service import get_analysis_data, get_prices_from_alpaca

async def stock_analysis(spec_stock: str):
    spec_stock = spec_stock.upper().strip()
    try:
        analysis = await get_analysis_data(spec_stock)
        if not analysis:
            return "The stock does not exist or there was an error fetching data."

        market_cap = analysis.get("marketCap")
        pe_st = analysis.get("trailingPE")
        expert_recommend = analysis.get("recommendationKey")
        return f"for the stock: {spec_stock}  market ca: {market_cap} the PE is: {pe_st} the expert recomendation: {expert_recommend}"

    except Exception:
        return "The stock does not exist or there was an error fetching data."

async def get_stock_details(stock: str):
    stock = stock.upper().strip()
    try:
        # Fetch analysis data and prices concurrently
        analysis_task = get_analysis_data(stock)
        prices_task = get_prices_from_alpaca(stock)
        
        results = await asyncio.gather(analysis_task, prices_task, return_exceptions=True)
        
        analysis = results[0] if isinstance(results[0], dict) else {}
        prices = results[1] if isinstance(results[1], dict) else None

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
