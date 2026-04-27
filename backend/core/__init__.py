"""
Core module for FastAPI application setup and configuration.
"""

from core.app import create_app, get_app
from core.config import settings, Settings
from core.logging import (
    get_logger,
    bind_context,
    configure_logging,
)

__all__ = [
    "create_app",
    "get_app",
    "settings",
    "Settings",
    "get_logger",
    "bind_context",
    "configure_logging",
]
