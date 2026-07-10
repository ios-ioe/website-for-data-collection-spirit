"""Submission check endpoints."""

import logging

from fastapi import APIRouter, HTTPException

from models.schemas import (
    CheckSubmissionRequest,
    CheckSubmissionResponse,
    DuplicateCheckResult,
    PiiCheckResult,
)
from services.duplicate_service import check_duplicate, get_model
from services.pii_service import scan_pii
from utils.exceptions import AppError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["submission"])


@router.post("/check-submission", response_model=CheckSubmissionResponse)
def check_submission(body: CheckSubmissionRequest):
    """
    Run duplicate and PII checks on submission text.

    Returns warnings only — never rejects a submission.
    """
    logger.info("check-submission received for team_id=%s", body.team_id)

    try:
        get_model()
    except RuntimeError as exc:
        logger.error("Model not loaded: %s", exc)
        raise HTTPException(status_code=503, detail="Embedding model unavailable") from exc

    pii_result = scan_pii(body.text)

    try:
        duplicate_result = check_duplicate(body.text)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Duplicate check failed: %s", exc)
        raise AppError("Could not reach the database for duplicate check", status_code=503) from exc

    response = CheckSubmissionResponse(
        duplicate=DuplicateCheckResult(**duplicate_result),
        pii=PiiCheckResult(**pii_result),
    )

    logger.info(
        "check-submission complete team_id=%s duplicate_flagged=%s pii_flagged=%s",
        body.team_id,
        response.duplicate.flagged,
        response.pii.flagged,
    )

    return response
