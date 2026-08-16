from sqlalchemy.orm import Session
from app.crud import crud_portfolio
from . import helpers_stock as hp

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

def get_portfolio_history(db: Session, user_id: int):
    info_st = crud_portfolio.get_portfolio_history(db, user_id)
    date_times = []
    portfolio_value = []
    for item in info_st:
        portfolio_value.append(item.total_value)
        date_times.append(item.calculation_date)
    return {"date_times": date_times, "portfolio_value": portfolio_value}
