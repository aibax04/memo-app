from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL - using PostgreSQL
# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./meeting_records.db")

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # Pool settings are handled differently for SQLite
    pool_pre_ping=True,
    pool_recycle=300
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 