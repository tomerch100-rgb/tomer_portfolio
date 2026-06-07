from router import auth , orders ,disiply,analysis,charts_r
import uvicorn
from fastapi import FastAPI
app = FastAPI()


#for the defult home page :
@app.get("/")
def home():
    return {"message": "welcome to tomer's stock portfolio "}

app.include_router(auth.router , prefix= "/auth")
app.include_router(orders.router , prefix= "/orders")
app.include_router(disiply.router , prefix= "/dry_disiply")
app.include_router(analysis.router )
app.include_router(charts_r.router, prefix= "/charts")

