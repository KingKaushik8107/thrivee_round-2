import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database.database import init_db
from backend.database.seed import seed_database
from backend.api import (
    analyze_router, incidents_router, campaigns_router,
    model_router, ai_router, dashboard_router, demo_router
)

# Ensure database tables exist upon module loading
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed demo data if empty
    print("[+] Starting PhishX Platform...")
    init_db()
    await seed_database()
    yield
    print("[-] Shutting down PhishX Platform.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Phishing Investigation & SOC Response Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS with configurable origins list and private LAN IP regex
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[!] Unhandled Exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "An internal error occurred during forensic processing.",
            "detail": str(exc)
        }
    )

# Register API Routers
app.include_router(analyze_router, prefix=settings.API_PREFIX)
app.include_router(incidents_router, prefix=settings.API_PREFIX)
app.include_router(campaigns_router, prefix=settings.API_PREFIX)
app.include_router(model_router, prefix=settings.API_PREFIX)
app.include_router(ai_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(demo_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def healthcheck():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "threat_intel_configured": bool(settings.VIRUSTOTAL_API_KEY or settings.URLHAUS_API_KEY or settings.ABUSEIPDB_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
