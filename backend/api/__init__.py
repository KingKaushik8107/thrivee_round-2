from backend.api.analyze import router as analyze_router
from backend.api.incidents import router as incidents_router
from backend.api.campaigns import router as campaigns_router
from backend.api.model_api import router as model_router
from backend.api.ai_api import router as ai_router
from backend.api.dashboard import router as dashboard_router
from backend.api.demo import router as demo_router

__all__ = [
    "analyze_router",
    "incidents_router",
    "campaigns_router",
    "model_router",
    "ai_router",
    "dashboard_router",
    "demo_router"
]
