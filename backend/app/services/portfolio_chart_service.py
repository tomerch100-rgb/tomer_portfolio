from sqlalchemy.orm import Session
from app.crud import crud_portfolio
import app.services.helpers_stock as hp
import app.services.stock_charts as sc

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
