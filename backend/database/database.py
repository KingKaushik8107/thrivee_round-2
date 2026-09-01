from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import settings

# If using SQLite, ensure check_same_thread=False
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs = {"connect_args": {"check_same_thread": False}} if is_sqlite else {}

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
