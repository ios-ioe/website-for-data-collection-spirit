"""Login endpoints — the only places that mint session tokens."""

import hmac
import logging

from fastapi import APIRouter, HTTPException

from config import ADMIN_PASSWORD
from database import verify_access_code
from models.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    LoginRequest,
    LoginResponse,
)
from utils.auth import create_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    """Verify a team's access code server-side (service role key) and issue a
    signed session token. The frontend never queries the teams table directly."""
    row = verify_access_code(body.access_code.strip())
    if not row:
        raise HTTPException(status_code=401, detail="That access code doesn't match a team.")

    token = create_token(role="team", team_id=row["team_id"], team_name=row["team_name"])
    return LoginResponse(team_id=row["team_id"], team_name=row["team_name"], token=token)


@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest):
    """Verify the organizer password server-side. ADMIN_PASSWORD lives only in
    backend secrets — it is never sent to the browser (unlike the old VITE_
    build-time env var, which shipped inside the JS bundle)."""
    if not ADMIN_PASSWORD:
        raise HTTPException(status_code=500, detail="Server missing ADMIN_PASSWORD secret.")
    if not hmac.compare_digest(body.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Wrong password.")

    token = create_token(role="admin")
    return AdminLoginResponse(token=token)
