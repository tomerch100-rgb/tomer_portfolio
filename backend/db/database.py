from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.base_class import Base

SQLALCHEMY_DATABASE_URL = "postgresql://tomerchaimi@localhost/stock_portfolio"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models here to register them with Base metadata before calling create_all
from classes import models
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()