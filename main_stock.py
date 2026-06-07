import portfolio_function as pf
import stock_database as sd

try:
    pf.save_current_portfolio_value()
except Exception:
    pass

while True:
    print("\n" + "="*30)
    print("--- Stock Portfolio Menu ---")
    print("1. Add Stock (Buy)")
    print("2. Sell Stock")
    print("3. Show Portfolio (Live Data)")
    print("4. Stock Analysis & 1-Month Graph")
    print("5. Plot Portfolio Allocation (Pie Chart)")
    print("6. Plot Daily Performance (Bar Chart)")
    print("7. Plot Portfolio Value History (Line Graph)") # האופציה הזו זזה ל-7
    print ("8, this is for log history ")
    print("9. Exit")
    print("="*30)
    
    choosen = input("Choose an option (1-8): ")
    
    if choosen == "1":
        print("--buy stock--")
        try:
            stock_input = input("Which stock do you want to buy: ")
            shares_input = float(input("How many shares did you buy? "))
            price_input = float(input("At what price did you buy it: "))
            result = pf.add_stock(stock_input,shares_input,price_input)
            print (result)
        except ValueError:
            print("Error: Please enter valid numbers for shares and price.")

    elif choosen == "2":
        try :
            sell_stock = input ("which stock do you want to sell:  ").upper()
            sell_shares = float(input ("how much shers did you sell: "))
            sell_price = float(input ("in which price you sell it: "))
            sell_result = pf.sell_stock(sell_stock,sell_shares,sell_price)
            print(sell_result)
        except     ValueError:
            print("Invalid number for shares or price: ")

    elif choosen == "3":
        # בכל פעם שהוא בודק את התיק, נשמור ברקע את השווי המעודכן
        pf.save_current_portfolio_value()
        print(pf.show_portfolio())
    elif choosen == "4":
        spec_stock = input("which stock you want for analyze: ")
        analyze_stock = pf.stock_analysis(spec_stock)
        print(analyze_stock)
    elif choosen == "5":
        pf.plot_protfolio_pie()
    elif choosen == "6":
        pf.plot_daily_change()
    elif choosen == "7":
        pf.plot_portfolio_history()
    elif choosen == "8":
        pf.log_history()   
    elif choosen == "9":
        sd.close_connection()
        print("Goodbye!")
        break
    else:
        print("Invalid option, please choose from 1-8.")
