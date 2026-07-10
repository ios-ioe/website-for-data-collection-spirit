"""
Nepali Bias Data Collection — QA backend (FastAPI, Docker HF Space).

The frontend talks to Supabase directly for CRUD. This service handles:
  POST /check-submission  — live duplicate + PII soft-check
  POST /qa-batch          — organizer batch QA after close

The Supabase service role key lives only here, never in the browser.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from routers.health import router as health_router
from routers.submission import router as submission_router
from services.duplicate_service import warmup_model
from utils.exceptions import AppError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        warmup_model()
    except Exception as exc:
        logger.error("Failed to load embedding model at startup: %s", exc)
    yield


app = FastAPI(
    title="Nepali Bias Data QA Backend",
    description="Duplicate detection and PII scanning for the bias data collection tool.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(submission_router)


@app.exception_handler(AppError)
async def app_error_handler(_request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
