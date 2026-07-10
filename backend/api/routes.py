"""FastAPI route handlers."""

import logging

from fastapi import APIRouter, HTTPException

from config import MODEL_NAME, SIMILARITY_THRESHOLD
from models.schemas import (
    CheckSubmissionRequest,
    CheckSubmissionResponse,
    DuplicateResult,
    HealthResponse,
    PiiResult,
)
from services.duplicate import check_duplicate, is_model_loaded
from services.pii import scan_pii
from services.qa_batch import run_qa_batch

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
def root():
    return {
        "service": "nepali-bias-qa",
        "status": "ok",
        "endpoints": ["/health", "/check-submission", "/qa-batch"],
    }


@router.get("/health", response_model=HealthResponse)
def health():
    from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

    secrets_ok = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
    return HealthResponse(
        status="ok",
        secrets_configured=secrets_ok,
        model=MODEL_NAME,
        model_loaded=is_model_loaded(),
        similarity_threshold=SIMILARITY_THRESHOLD,
    )


@router.post("/check-submission", response_model=CheckSubmissionResponse)
def check_submission_endpoint(request: CheckSubmissionRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is empty")

    logger.info("Checking submission for team=%s (len=%d)", request.team_id, len(text))

    duplicate_result = check_duplicate(text)
    pii_flagged, matched_terms = scan_pii(text)

    return CheckSubmissionResponse(
        duplicate=DuplicateResult(
            duplicate=duplicate_result["duplicate"],
            similarity=duplicate_result["similarity"],
            closest_snippet=duplicate_result["closest_snippet"],
        ),
        pii=PiiResult(flag=pii_flagged, matched_terms=matched_terms),
    )


@router.post("/qa-batch")
def qa_batch_endpoint():
    logger.info("Starting QA batch")
    return run_qa_batch()
