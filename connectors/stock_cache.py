import time
cache_dic = {}
cache_ttL = 60


def set_cache_dic (stock,stock_data):
    stock = stock.upper()
    cache_dic[stock]= { 
                    "stock_data" :stock_data,
                    "timestamp" : time.time()
    }
    return cache_dic

def get_stock_data(stock:str):
    stock = stock.upper()
    if stock in cache_dic :
        old_time = cache_dic[stock]["timestamp"]
        now_time = time.time()
        passed_time = now_time -old_time
        if passed_time < cache_ttL :
            return cache_dic[stock]["stock_data"]
        else :
            del cache_dic[stock] 
            return None   
    else : 
        return  None 