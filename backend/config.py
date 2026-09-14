import os
import tempfile
from pydantic import BaseModel
from typing import List

# Ensure tldextract cache writes to temp directory in serverless environments
os.environ.setdefault("TLDEXTRACT_CACHE", os.path.join(tempfile.gettempdir(), "tldextract"))

# Detect if executing inside a serverless cloud runtime (Vercel / AWS Lambda)
IS_SERVERLESS = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or os.getenv("LAMBDA_TASK_ROOT"))

def _resolve_default_db_url() -> str:
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    if IS_SERVERLESS:
        tmp_db = os.path.join(tempfile.gettempdir(), "phishing_platform.db").replace("\\", "/")
        return f"sqlite:///{tmp_db}"
    return "sqlite:///./phishing_platform.db"

def _resolve_model_dir() -> str:
    if os.getenv("MODEL_DIR"):
        return os.getenv("MODEL_DIR")
    # Path relative to backend/
    base_models = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
    if os.path.exists(base_models):
        return base_models
    # Path relative to current working directory
    cwd_models = os.path.abspath(os.path.join(os.getcwd(), "models"))
    if os.path.exists(cwd_models):
        return cwd_models
    return base_models

class Settings(BaseModel):
    PROJECT_NAME: str = "PhishX — AI-Powered Phishing Investigation & SOC Response Platform"
    API_PREFIX: str = "/api"
    
    # Database: Supports SQLite (local or tempfile in serverless) or PostgreSQL via DATABASE_URL
    DATABASE_URL: str = _resolve_default_db_url()
    
    # Threat Intelligence API Keys (Pluggable, optional)
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    URLHAUS_API_KEY: str = os.getenv("URLHAUS_API_KEY", "")
    ABUSEIPDB_API_KEY: str = os.getenv("ABUSEIPDB_API_KEY", "")
    
    # AI / LLM API Key (Optional)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Model Artifacts Directory
    MODEL_DIR: str = _resolve_model_dir()
    
    # CORS: Configurable list via environment variable (comma-separated string)
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "")
    
    # Regex matching local, LAN, Vercel cloud domains, and Chrome Extension origins
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^(https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.\d{1,3}\.\d{1,3}\.\d{1,3}|.*\.vercel\.app)(:\d+)?|chrome-extension://[a-z]+)$"
    )

    def get_cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS_RAW:
            return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "https://phisdetect-tau.vercel.app"
        ]

settings = Settings()
