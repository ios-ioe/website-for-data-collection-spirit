"""Pydantic schemas for API requests and responses."""

from pydantic import BaseModel, Field


class CheckSubmissionRequest(BaseModel):
    team_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)


class DuplicateCheckResult(BaseModel):
    flagged: bool = False
    similarity: float = 0.0
    closest_match_snippet: str = ""


class PiiCheckResult(BaseModel):
    flagged: bool = False
    matched_terms: list[str] = Field(default_factory=list)


class CheckSubmissionResponse(BaseModel):
    duplicate: DuplicateCheckResult
    pii: PiiCheckResult


class QaBatchResponse(BaseModel):
    total_rows: int = 0
    flagged_duplicate: int = 0
    flagged_pii: int = 0
    updated_rows: int = 0
