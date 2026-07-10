"""Supabase client and data access helpers."""

from typing import Optional

from fastapi import HTTPException
from supabase import Client, create_client

from config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """Return a singleton Supabase client using the service role key."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(
                status_code=500,
                detail="Server missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY secrets.",
            )
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _supabase


def fetch_all_submissions(columns: str, limit: Optional[int] = None) -> list[dict]:
    """Fetch rows from submissions, paginating past Supabase's 1000-row cap."""
    sb = get_supabase()
    rows: list[dict] = []
    page = 0
    page_size = 1000

    while True:
        start = page * page_size
        end = start + page_size - 1
        query = (
            sb.table("submissions")
            .select(columns)
            .order("submitted_at", desc=True)
            .range(start, end)
        )
        result = query.execute()
        batch = result.data or []
        rows.extend(batch)

        if len(batch) < page_size:
            break
        if limit and len(rows) >= limit:
            break
        page += 1

    return rows[:limit] if limit else rows
