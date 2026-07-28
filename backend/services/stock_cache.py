import time

class CacheManager :

    def __init__ (self,cache_ttL) :
        self.cache_dic = {}
        self.ttL = cache_ttL

    def set_cache_dic (self,stock,stock_data):
        stock = stock.upper()
        self.cache_dic[stock]= { 
            "stock_data" :stock_data,
            "timestamp" : time.time()
    }
    def get_stock_data(self,stock:str):
        stock = stock.upper()
        if stock in self.cache_dic :
            old_time = self.cache_dic[stock]["timestamp"]
            now_time = time.time()
            passed_time = now_time -old_time
            if passed_time < self.ttL :
                return self.cache_dic[stock]["stock_data"]
            else :
                del self.cache_dic[stock] 
                return None   
        else : 
            return  None 

# Shared cache instance with 5-minute TTL (300 seconds)
_shared_cache = CacheManager(cache_ttL=300)

def set_cache_dic(stock, stock_data):
    return _shared_cache.set_cache_dic(stock, stock_data)

def get_stock_data(stock):
    return _shared_cache.get_stock_data(stock)
 