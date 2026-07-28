from router import auth , orders ,display,analysis,charts_r,home_page,watchlist
import uvicorn
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import FastAPI

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

if __name__ == "__main__":
    # הרצת השרת על פורט 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


from db.database import engine  
from classes import models   


models.Base.metadata.create_all(bind=engine)