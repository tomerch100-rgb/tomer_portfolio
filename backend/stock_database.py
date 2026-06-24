import psycopg2
import connectors.models as lc
import security as hash
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

    def insert_into_portfolio(self,user_id,stock,shares,price_by,sector):
        self.cur.execute(" insert into portfolio (user_id,ticker , shares, avg_price,sector) values (%s,%s,%s,%s,%s)",(user_id,stock,shares,price_by,sector))
        self.conn.commit()
    
    def log_transaction(self,user_id,stock,action_type,shares,avg_price,realized_pl):
        self.cur.execute("insert into transactions (user_id,ticker,type,shares,price,realized_pl) values(%s,%s,%s,%s,%s,%s)" ,(user_id,stock,action_type,shares,avg_price,realized_pl))
        self.conn.commit()

    def  get_portfolio_stock (self,user_id,stock) :
        self.cur.execute("select shares,avg_price from portfolio where ticker = %s and user_id = %s" , (stock,user_id) )
        pick = self.cur.fetchone()  
        if pick is None :
            return None
        hold = lc.Holding(stock,pick[0],pick[1])
        return hold
    

    def  update_portfolio (self,user_id,sher_st,avg_st,stock)   :
        self.cur.execute(" update  portfolio set shares = %s , avg_price = %s where ticker = %s and user_id = %s", (sher_st,avg_st,stock,user_id))
        self.conn.commit()

    def delet_from_portfolio (self,user_id,stock) :
        self.cur.execute("delete from portfolio where ticker = %s and user_id = %s" , (stock,user_id))
        self.conn.commit()

    
    def select_all (self,user_id) :
        self.cur.execute("SELECT ticker, shares, avg_price from portfolio where user_id = %s" , (user_id,))
        rows =  self.cur.fetchall()
        portfolio_list =  []
        for row in rows :
            hold =  lc.Holding(row[0],row[1],row[2])
            portfolio_list.append(hold)
        return portfolio_list
        
    
    def total_profit_loss (self,user_id):
        self.cur.execute("select sum (realized_pl) from transactions where user_id = %s" , (user_id,))
        return self.cur.fetchone()

    def insert_portfolio_history (self,user_id,total_portfolio_worth):
        self.cur.execute ("insert into portfolio_history (user_id,total_value) values (%s,%s) ",(user_id,total_portfolio_worth))
        self.conn.commit()

    def select_portfolio_history (self,user_id):
        self.cur.execute("select total_value, calculation_date from portfolio_history where user_id = %s order by calculation_date",(user_id,))
        return  self.cur.fetchall()    
    
    def log_history (self,user_id) :
        self.cur.execute("select ticker,type,shares,price,realized_pl,transaction_date from transactions where user_id = %s order by transaction_date desc",(user_id,))
        rows =  self.cur.fetchall()
        log_list = []
        for row in rows :
            log = lc.transition_log(row[0],row[1],row[2],row[3],row[4],row[5])
            log_list.append(log)
        return log_list    

    def total_value(self,user_id):
        self.cur.execute("SELECT COALESCE(SUM(shares*avg_price), 0) FROM portfolio where user_id = %s",(user_id,))
        result = self.cur.fetchone()
        return float(result[0])
        
    def number_of_positions(self,user_id):
        self.cur.execute("select count(*) from portfolio where user_id = %s",(user_id,))
        return self.cur.fetchone()[0]
    
    def register_user(self,username,password,email):
        safty = hash.hash_password (password)
        self.cur.execute("insert into users (username,password_hash,email) values (%s,%s,%s)",(username,safty ,email))
        self.conn.commit()
         
    def user_exists(self, username):
    # שואלים את ה-DB: "האם יש מישהו כזה?"
        self.cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
        result = self.cur.fetchone()
    # אם קיבלנו משהו בחזרה (result הוא לא None), סימן שהמשתמש קיים
        return result is not None
    
    def check_login_user(self,username,password) :
        self.cur.execute("SELECT user_id, password_hash FROM users WHERE username = %s", (username,))
        result = self.cur.fetchone()
    # אם המשתמש בכלל לא קיים ב-DB
        if result is None:
                return None
        user_id = result[0]
        stored_hash = result[1]
    # בודקים אם הסיסמה מתאימה להאש
        if hash.verify_password(stored_hash, password):
            return user_id  # הסיסמה נכונה! מחזירים את ה-ID
        else :
            return None

        
    def get_me_db (self,user_id):
        self.cur.execute("SELECT user_id,username, email FROM users WHERE user_id = %s", (user_id,))
        result = self.cur.fetchone()
        if not result :
            return None
        personal_dic = {
                "user_id" : result[0],
                "username" :  result[1],
                    "email" : result[2]
            }
        return personal_dic

    def post_watchlist_db  (self,user_id,stock) :
        self.cur.execute("insert into watchlist (user_id,ticker) values(%s,%s)" ,(user_id,stock.upper()))
        self.conn.commit()

    def get_watchlist_db (self,user_id) :
        self.cur.execute("select ticker from watchlist where user_id = %s order by order_index",(user_id,))
        pick = self.cur.fetchall()  
        if pick is None :
            return None
        personal_list = []
        for each_stock in pick : 
            personal_list.append(each_stock[0])
        return personal_list    



        






        
