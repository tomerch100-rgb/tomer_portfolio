
import psycopg2
import list_convert as lc
class PortfolioDB:
    def __init__(self):
        self.conn = psycopg2.connect(
        dbname="stock_portfolio",
        user="tomerchaimi", 
        host="localhost"     
)
        self.cur = self.conn.cursor()

    def close_connection(self):
        self.cur.close()
        self.conn.close()    

    
    def log_transaction(self,stock,action_type,shares,avg_price,realized_pl):
        self.cur.execute("insert into transactions (ticker,type,shares,price,realized_pl) values(%s,%s,%s,%s,%s)" ,(stock,action_type,shares,avg_price,realized_pl))
         

    def  get_portfolio_stock (self,stock) :
        self.cur.execute("select shares,avg_price from portfolio where ticker = %s", (stock,) )
        pick = self.cur.fetchone()  
        hold = lc.Holding(stock,pick[0],pick[1])
        return hold
    
    def insert_into_portfolio(self,stock,shares,price_by):
        self.cur.execute(" insert into portfolio (ticker , shares, avg_price) values (%s,%s,%s)",(stock,shares,price_by))

    def  update_portfolio (self,sher_st,avg_st,stock)   :
        self.cur.execute(" update  portfolio set shares = %s , avg_price = %s where ticker = %s ", (sher_st,avg_st,stock))

    def delet_from_portfolio (self,stock) :
        self.cur.execute("delete from portfolio where ticker = %s" , (stock,))
    
    def select_all (self) :
        self.cur.execute("SELECT ticker, shares, avg_price from portfolio;")
        rows =  self.cur.fetchall()
        portfolio_list =  []
        for row in rows :
            hold =  lc.Holding(row[0],row[1],row[2])
            portfolio_list.append(hold)
        return portfolio_list
        
    
    def total_profit_loss (self):
        self.cur.execute("select sum (realized_pl) from transactions ")
        return self.cur.fetchone()

    def insert_portfolio_history (self,total_portfolio_worth):
        self.cur.execute ("insert into portfolio_history (total_value) values (%s)",(total_portfolio_worth,))
        self.conn.commit()

    def select_portfolio_history (self):
        self.cur.execute("select total_value, calculation_date from portfolio_history")
        return  self.cur.fetchall()    
    
    def log_history (self) :
        self.cur.execute("select ticker,type,shares,price,realized_pl,transaction_date from transactions order by transaction_date desc")
        rows =  self.cur.fetchall()
        log_list = []
        for row in rows :
            log = lc.transition_log(row[0],row[1],row[2],row[3],row[4],row[5])
            log_list.append(log)
        return log_list    

    def total_value(self):
        self.cur.execute("SELECT COALESCE(SUM(shares*avg_price), 0) FROM portfolio")
        result = self.cur.fetchone()
        return float(result[0])
        
    def number_of_positions(self):
        self.cur.execute("select count(*) from portfolio")
        return self.cur.fetchone()[0]