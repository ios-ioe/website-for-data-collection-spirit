"""Duplicate detection: RapidFuzz pre-filter + embedding similarity."""

import logging
from typing import Optional

from rapidfuzz import fuzz, process

from config import (
    FUZZ_PREFILTER_THRESHOLD,
    FUZZ_TOP_K,
    MODEL_NAME,
    SIMILARITY_THRESHOLD,
)
from database import fetch_all_submissions

logger = logging.getLogger(__name__)

_model = None


def get_model():
    """Lazy-load the sentence-transformers model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model: %s", MODEL_NAME)
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def is_model_loaded() -> bool:
    return _model is not None


def warmup_model() -> None:
    """Pre-load the model at startup."""
    try:
        get_model()
    except Exception as exc:
        logger.warning("Model warmup failed (will retry on demand): %s", exc)


def _cosine_best(new_text: str, candidates: list[str]) -> tuple[float, int]:
    if not candidates:
        return 0.0, -1

    from sentence_transformers import util

    model = get_model()
    embeddings = model.encode(
        [new_text] + candidates,
        convert_to_tensor=True,
        normalize_embeddings=True,
    )
    similarities = util.cos_sim(embeddings[0:1], embeddings[1:])[0]
    best_idx = int(similarities.argmax())
    return float(similarities[best_idx]), best_idx


def _truncate_snippet(text: str, max_len: int = 160) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len] + "…"


def check_duplicate(text: str) -> dict:
    """
    Compare text against all existing submissions.
    Returns duplicate flag, similarity score, and closest snippet.
    """
    existing = fetch_all_submissions("id,text", limit=8000)
    existing = [row for row in existing if (row.get("text") or "").strip()]

    result = {
        "duplicate": False,
        "similarity": 0.0,
        "closest_snippet": None,
    }

    if not existing:
        return result

    texts = [row["text"] for row in existing]
    prelim = process.extract(
        text,
        texts,
        scorer=fuzz.token_set_ratio,
        limit=FUZZ_TOP_K,
    )
    candidates = [
        (candidate_text, score)
        for candidate_text, score, _idx in prelim
        if score >= FUZZ_PREFILTER_THRESHOLD
    ]

    if not candidates:
        return result

    candidate_texts = [candidate[0] for candidate in candidates]
    best_score, best_idx = _cosine_best(text, candidate_texts)

    if best_idx >= 0:
        snippet = candidate_texts[best_idx]
        result = {
            "duplicate": best_score >= SIMILARITY_THRESHOLD,
            "similarity": round(best_score, 3),
            "closest_snippet": _truncate_snippet(snippet),
        }

    return result


def pairwise_duplicates(rows: list[dict], threshold: Optional[float] = None) -> list[dict]:
    """Exhaustive duplicate detection for batch QA."""
    if threshold is None:
        threshold = SIMILARITY_THRESHOLD

    valid = [row for row in rows if (row.get("text") or "").strip()]
    flagged: list[dict] = []

    if len(valid) < 2:
        return flagged

    from sentence_transformers import util

    model = get_model()
    embeddings = model.encode(
        [row["text"] for row in valid],
        convert_to_tensor=True,
        normalize_embeddings=True,
        batch_size=64,
        show_progress_bar=False,
    )
    similarities = util.cos_sim(embeddings, embeddings)

    for j in range(1, len(valid)):
        row_sims = similarities[j][:j]
        best_i = int(row_sims.argmax())
        best_score = float(row_sims[best_i])
        if best_score >= threshold:
            flagged.append(
                {
                    "id": valid[j]["id"],
                    "duplicate_of": valid[best_i]["id"],
                    "similarity": round(best_score, 3),
                }
            )

    return flagged
