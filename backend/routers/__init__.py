"""
API Routers for the MARS-RFP backend.
"""

from routers.health import router as health_router
from routers.files import router as files_router
from routers.credentials import router as credentials_router
from routers.rfp import router as rfp_router
from routers.models import router as models_router


def register_routers(app):
    """Register all routers with the FastAPI application."""
    app.include_router(health_router)
    app.include_router(rfp_router)
    app.include_router(files_router)
    app.include_router(credentials_router)
    app.include_router(models_router)
