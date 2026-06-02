class Holding:
    def __init__(self, ticker, shares, avg_price):
        self.ticker = ticker
        self.shares = float(shares)
        self.avg_price = float(avg_price)

    # פונקציה פנימית של המניה שמחשבת כמה עלה לנו לקנות אותה
    def cost_basis(self):
        return self.shares * self.avg_price
    # בתוך models.py
    def calculate_realized_pl (self, sell_price, sell_shares):
        return (sell_price - self.avg_price) * sell_shares
class transition_log:
    def __init__(self, ticker, action_type, shares, price, realized_pl, transaction_date):
        self.ticker = ticker
        self.action_type = action_type
        self.shares = shares
        self.price = price
        self.realized_pl = realized_pl
        self.transaction_date = transaction_date
        