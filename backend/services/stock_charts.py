import matplotlib.pyplot as plt
def month_graf (stock,graf) :
    graf['Close'].plot(color='orange', linewidth=2)
    plt.title(f"{stock} - 1 Month Price History")
    plt.xlabel("Date")
    plt.ylabel("Price ($)")
    plt.grid(True)
    plt.show() 
    return "SUCCESS"

def plot_pie (values,tickers):
    plt.pie(values, labels=tickers, autopct='%1.1f%%')
    plt.title("Portfolio Allocation")
    plt.show()
    return "SUCCESS"

def plot_daily_change (tickers, daily_change,colors_plt):
    plt.bar(tickers, daily_change,color=colors_plt)
    plt.ylabel("Change ($)")
    plt.title("Daily Performance")
    plt.show()
    return "SUCCESS"

def plot_history (date_times, portfolio_value):
    plt.plot(date_times, portfolio_value, marker='o', color='blue', linewidth=2)
    plt.xlabel("Date")
    plt.ylabel("Total Portfolio Value ($)")
    plt.title("Total Portfolio Value History")
    plt.grid(True)  
    plt.show()
    return "SUCCESS"




