import os
from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    PROJECT_NAME: str = "PS-02 Phishing Attack Investigation Platform"
    API_PREFIX: str = "/api"
    
    # Database: Supports SQLite by default or PostgreSQL via DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./phishing_platform.db")
    
    # Threat Intelligence API Keys (Pluggable, optional)
    VIRUSTOTAL_API_KEY: str = os.getenv("VIRUSTOTAL_API_KEY", "")
    URLHAUS_API_KEY: str = os.getenv("URLHAUS_API_KEY", "")
    ABUSEIPDB_API_KEY: str = os.getenv("ABUSEIPDB_API_KEY", "")
    
    # AI / LLM API Key (Optional)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Model Artifacts Directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models")))
    
    # CORS: Configurable list via environment variable (comma-separated string)
    CORS_ORIGINS_RAW: str = os.getenv("CORS_ORIGINS", "")
    
    # Regex matching local and private LAN IPv4 addresses (192.168.x.x, 10.x.x.x, 172.x.x.x, localhost)
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$"
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
            "http://127.0.0.1:8000"
        ]

settings = Settings()
