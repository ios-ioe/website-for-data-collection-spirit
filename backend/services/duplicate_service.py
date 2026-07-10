"""Duplicate detection using RapidFuzz pre-filter and sentence embeddings."""

import logging
from typing import Optional, TypedDict

import numpy as np
from rapidfuzz import fuzz, process
from sentence_transformers import SentenceTransformer

from config import (
    FUZZ_PREFILTER_THRESHOLD,
    FUZZ_TOP_K,
    MODEL_NAME,
    SIMILARITY_THRESHOLD,
)
from database import fetch_all_submissions

logger = logging.getLogger(__name__)

SNIPPET_MAX_LEN = 100

_model: Optional[SentenceTransformer] = None


class DuplicateResult(TypedDict):
    flagged: bool
    similarity: float
    closest_match_snippet: str


def warmup_model() -> None:
    """Load the embedding model once at startup."""
    global _model
    if _model is not None:
        return
    logger.info("Loading embedding model: %s", MODEL_NAME)
    _model = SentenceTransformer(MODEL_NAME)
    logger.info("Embedding model loaded successfully")


def get_model() -> SentenceTransformer:
    if _model is None:
        raise RuntimeError("Embedding model is not loaded. Call warmup_model() at startup.")
    return _model


def is_model_loaded() -> bool:
    return _model is not None


def _truncate_snippet(text: str, max_len: int = SNIPPET_MAX_LEN) -> str:
    cleaned = text.strip()
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 1].rstrip() + "…"


def _empty_result() -> DuplicateResult:
    return {
        "flagged": False,
        "similarity": 0.0,
        "closest_match_snippet": "",
    }


def _cosine_similarity(query_emb: np.ndarray, candidate_embs: np.ndarray) -> np.ndarray:
    return np.dot(candidate_embs, query_emb)


def check_duplicate(text: str) -> DuplicateResult:
    """
    Compare text against existing submissions.

    Uses RapidFuzz to narrow candidates, then embedding cosine similarity
    on the top fuzzy matches only.
    """
    normalized = text.strip()
    if not normalized:
        return _empty_result()

    rows = fetch_all_submissions("id, text")
    if not rows:
        logger.info("Duplicate check: empty database, no candidates")
        return _empty_result()

    corpus: dict[str, str] = {}
    for row in rows:
        row_text = (row.get("text") or "").strip()
        if row_text:
            corpus[row["id"]] = row_text

    if not corpus:
        return _empty_result()

    id_list = list(corpus.keys())
    text_list = [corpus[row_id] for row_id in id_list]

    fuzzy_hits = process.extract(
        normalized,
        text_list,
        scorer=fuzz.ratio,
        limit=min(FUZZ_TOP_K, len(text_list)),
    )

    candidates: list[tuple[str, str]] = []
    for _match_text, score, index in fuzzy_hits:
        if score >= FUZZ_PREFILTER_THRESHOLD:
            row_id = id_list[index]
            candidates.append((row_id, corpus[row_id]))

    if not candidates:
        logger.info("Duplicate check: no fuzzy candidates above threshold")
        return _empty_result()

    model = get_model()
    query_emb = model.encode(normalized, normalize_embeddings=True)

    candidate_texts = [item[1] for item in candidates]
    candidate_embs = model.encode(candidate_texts, normalize_embeddings=True)

    similarities = _cosine_similarity(query_emb, candidate_embs)
    best_idx = int(np.argmax(similarities))
    best_similarity = float(similarities[best_idx])
    best_text = candidate_texts[best_idx]

    flagged = best_similarity >= SIMILARITY_THRESHOLD
    logger.info(
        "Duplicate check: similarity=%.4f flagged=%s candidates=%d",
        best_similarity,
        flagged,
        len(candidates),
    )

    return {
        "flagged": flagged,
        "similarity": round(best_similarity, 4),
        "closest_match_snippet": _truncate_snippet(best_text),
    }


def pairwise_duplicates(
    rows: list[dict], threshold: Optional[float] = None
) -> list[dict]:
    """Exhaustive duplicate detection for organizer QA batch."""
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
                    "similarity": round(best_score, 4),
                }
            )

    return flagged
