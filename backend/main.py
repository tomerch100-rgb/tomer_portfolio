from app.api.routers import auth , orders ,display,analysis,charts_r,home_page,watchlist,transaction_router
import uvicorn
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI
from app.db.session import engine  
from app.db.base_class import Base


app = FastAPI()

origins = [
    "http://localhost:5173", 
    "http://localhost:5175", 

    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.include_router(auth.router)
app.include_router(orders.router )
app.include_router(display.router )
app.include_router(analysis.router )
app.include_router(charts_r.router)
app.include_router(home_page.router )
app.include_router(watchlist.router )
app.include_router(transaction_router.router)




Base.metadata.create_all(bind=engine)