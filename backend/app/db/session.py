import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Optimized Engine Configuration for Neon Serverless PostgreSQL with PgBouncer/Connection Pooling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,       # Verifies connection liveness before checking out from pool
    pool_recycle=300,         # Recycles idle connections after 5 minutes (prevents stale serverless drops)
    pool_size=10,             # Number of persistent connection slots
    max_overflow=20,          # Allow temporary burst connections under load
    pool_timeout=30           # Maximum wait seconds before timeout
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models to register them with Base metadata
import app.models
Base.metadata.create_all(bind=engine)

def get_db():
    """
    FastAPI dependency yielding a lightweight DB session.
    Guarantees session cleanup upon request termination.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()