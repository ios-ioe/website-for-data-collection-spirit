"""
Nepali Bias Data Collection — backend (FastAPI, Docker HF Space).

All reads and writes to `submissions`/`teams` go through this service using the
Supabase service role key — the frontend no longer talks to Supabase directly
with the anon key for CRUD. Routes:
  POST /login                 — access code -> signed team session token
  POST /admin/login           — organizer password -> signed admin session token
  POST /check-submission      — live duplicate + PII soft-check (no auth; advisory only)
  POST /submit                — insert a submission for the logged-in team
  GET  /my-submissions        — the logged-in team's own rows only
  GET  /my-count               — the logged-in team's own submission count
  GET  /admin/leaderboard      — admin-only: ranked team standings
  GET  /admin/submissions      — admin-only: full table
  POST /admin/qa-batch         — admin-only: organizer batch QA after close
  POST /admin/mark-reviewed    — admin-only
  GET  /admin/export           — admin-only: JSON export

The Supabase service role key and SESSION_SECRET/ADMIN_PASSWORD live only here,
never in the browser.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL
from routers.admin import router as admin_router
from routers.auth import router as auth_router
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
        # warmup_model()
        pass
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
app.include_router(auth_router)
app.include_router(submission_router)
app.include_router(admin_router)


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
