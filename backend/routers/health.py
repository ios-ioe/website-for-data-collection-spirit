"""Health check endpoint."""

from fastapi import APIRouter

from config import (
    MODEL_NAME,
    SIMILARITY_THRESHOLD,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
from services.duplicate_service import is_model_loaded

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {
        "status": "ok",
        "secrets_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
        "model_loaded": is_model_loaded(),
        "model_name": MODEL_NAME,
        "similarity_threshold": SIMILARITY_THRESHOLD,
    }
