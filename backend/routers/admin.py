"""Organizer-only endpoints. Every route here requires a valid admin session
token (see utils/auth.require_admin) verified server-side — unlike the old
frontend gate, the password check and the resulting authorization never touch
the browser bundle."""

import logging
import re
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

import database
from config import CATEGORIES, NON_BIASED_TARGET, QUOTAS
from models.schemas import CreateTeamRequest, MarkReviewedRequest, TeamResponse
from services.qa_batch import run_qa_batch
from utils.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

AdminSession = Annotated[dict, Depends(require_admin)]

_ADMIN_COLUMNS = (
    "id,team_id,text,"
    + ",".join(f'"{c}"' if c[0].isupper() else c for c in CATEGORIES)
    + ",source_platform,source_date,submitted_at,flag_duplicate,flag_pii,judge_reviewed"
)


@router.get("/submissions")
def all_submissions(_: AdminSession):
    """Full submissions table — admin only. Teams cannot reach this endpoint."""
    return database.fetch_all_submissions(_ADMIN_COLUMNS)


@router.get("/leaderboard")
def leaderboard(_: AdminSession):
    """Per-team credited counts (excludes rows flagged as duplicates), ranked.
    This replaces the old public /leaderboard route — only organizers can see
    team rankings now."""
    rows = database.fetch_all_submissions(
        "team_id,flag_duplicate," + ",".join(f'"{c}"' if c[0].isupper() else c for c in CATEGORIES)
    )
    totals: dict[str, dict] = {}
    for row in rows:
        team_id = row.get("team_id")
        if not team_id:
            continue
        bucket = totals.setdefault(team_id, {"team_id": team_id, "total": 0, "credited": 0})
        bucket["total"] += 1
        if not row.get("flag_duplicate"):
            bucket["credited"] += 1

    ranked = sorted(totals.values(), key=lambda r: r["credited"], reverse=True)
    return ranked


@router.post("/mark-reviewed")
def mark_reviewed(body: MarkReviewedRequest, _: AdminSession):
    database.update_judge_reviewed(body.id, body.reviewed)
    return {"ok": True}


@router.post("/qa-batch")
def qa_batch(_: AdminSession):
    logger.info("Admin triggered QA batch")
    return run_qa_batch()


@router.get("/export")
def export_json(_: AdminSession):
    """Full export with exact published dataset column names."""
    rows = database.fetch_all_submissions(_ADMIN_COLUMNS)
    export_keys = [
        "team_id", "text", "gender", "religional", "caste", "religion",
        "appearence", "socialstatus", "amiguity", "political", "Age",
        "Disablity", "source_platform", "source_date", "submitted_at",
        "flag_duplicate", "flag_pii", "judge_reviewed",
    ]
    return [{key: row.get(key) for key in export_keys} for row in rows]


@router.get("/quota-report")
def quota_report(_: AdminSession):
    rows = database.fetch_all_submissions(
        "team_id," + ",".join(f'"{c}"' if c[0].isupper() else c for c in CATEGORIES)
    )
    team_ids = sorted({r["team_id"] for r in rows if r.get("team_id")})
    report = {}
    for team_id in team_ids:
        team_rows = [r for r in rows if r.get("team_id") == team_id]
        team_report = {}
        for category in CATEGORIES:
            count = sum(1 for r in team_rows if int(r.get(category) or 0) == 1)
            team_report[category] = {"count": count, "required": QUOTAS.get(category, 0)}
        non_biased = sum(
            1 for r in team_rows if all(int(r.get(c) or 0) == 0 for c in CATEGORIES)
        )
        team_report["non_biased"] = {"count": non_biased, "required": NON_BIASED_TARGET}
        report[team_id] = team_report
    return report


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")
    return slug or "team"


def _generate_access_code(slug: str) -> str:
    # e.g. "team-everest-9f2a1c" — short, unique-enough, and doesn't leak team_id
    # ordering since it's random, not sequential.
    suffix = secrets.token_hex(3)
    return f"{slug[:16]}-{suffix}"


@router.get("/teams", response_model=list[TeamResponse])
def get_teams(_: AdminSession):
    """List all teams with their access codes, so an organizer can copy one and
    send it manually via Gmail/whatever mail tool. Only reachable with an admin
    session — access codes never appear anywhere a team member can see them."""
    return database.list_teams()


@router.post("/teams", response_model=TeamResponse)
def add_team(body: CreateTeamRequest, _: AdminSession):
    """Create a new team with a freshly generated access code. This replaces
    hand-editing seed.sql for every team — organizers can add teams as they
    register, any time before or during the event.

    NOTE: this does not send an email itself. There's no email provider wired
    up (Resend/SendGrid/SMTP credentials, etc.) — the response includes the
    access_code so the organizer can copy it into Gmail (or any mail client)
    and send it to the team's contact_email by hand. If you want this to send
    automatically, tell me which email provider you want to use and I'll wire
    it in here.
    """
    slug = _slugify(body.team_name)
    team_id = f"team_{slug}_{secrets.token_hex(2)}"
    access_code = _generate_access_code(slug)

    try:
        row = database.create_team(team_id, body.team_name.strip(), access_code, body.contact_email)
    except Exception as exc:
        logger.error("Failed to create team: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create team — team_id or access_code collision, retry.")

    logger.info("Admin created team team_id=%s", team_id)
    return TeamResponse(**row)
