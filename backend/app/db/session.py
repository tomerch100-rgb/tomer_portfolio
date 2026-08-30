import logging
import os

from app.db.base_class import Base
from dotenv import find_dotenv, load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv(find_dotenv())
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))
logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Engine Configuration: Supports PostgreSQL (Neon/Render) and SQLite (Tests/Local)
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, pool_pre_ping=True, pool_recycle=300, pool_size=10, max_overflow=20, pool_timeout=30
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import models to register them with Base metadata
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
