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
    # Ensure status column exists in analysis_results for SQLite
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text("PRAGMA table_info(analysis_results);")).fetchall()
            columns = [row[1] for row in result]
            if columns and "status" not in columns:
                conn.execute(text("ALTER TABLE analysis_results ADD COLUMN status VARCHAR(50) DEFAULT 'new';"))
                conn.commit()
    except Exception as e:
        # If not SQLite or table doesn't exist yet, create_all handles it
        pass

