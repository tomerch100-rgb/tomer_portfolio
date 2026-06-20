from router import auth , orders ,disiply,analysis,charts_r,home_page,watchlist
import uvicorn
from fastapi import FastAPI
app = FastAPI()


app.include_router(auth.router , prefix= "/auth")
app.include_router(orders.router , prefix= "/orders")
app.include_router(disiply.router , prefix= "/dry_disiply")
app.include_router(analysis.router )
app.include_router(charts_r.router, prefix= "/charts")
app.include_router(home_page.router , prefix= "/home")
app.include_router(watchlist.router , prefix= "/watchlist")


if __name__ == "__main__":
    # הרצת השרת על פורט 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)