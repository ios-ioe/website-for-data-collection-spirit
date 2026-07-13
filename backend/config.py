"""Application configuration loaded from environment variables."""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Secret used to sign team/admin session tokens issued by this backend.
# MUST be set in production — a missing secret means sessions cannot be trusted.
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")

# Organizer password for /admin/login. Checked server-side only — never shipped to the browser.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

# How long a team/admin session token stays valid, in seconds. Default: 20 hours
# (covers a one-day event with margin) so all 2-4 members of a team can stay logged
# in on separate devices without re-entering the access code.
SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", str(20 * 60 * 60)))

MODEL_NAME = os.environ.get(
    "MODEL_NAME", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
SIMILARITY_THRESHOLD = float(os.environ.get("SIMILARITY_THRESHOLD", "0.90"))

# RapidFuzz pre-filter: skip embedding when string similarity is below this score.
FUZZ_PREFILTER_THRESHOLD = int(os.environ.get("FUZZ_PREFILTER_THRESHOLD", "55"))
FUZZ_TOP_K = int(os.environ.get("FUZZ_TOP_K", "25"))

# Batch QA uses a slightly stricter threshold than live checks.
BATCH_SIMILARITY_THRESHOLD = float(
    os.environ.get("BATCH_SIMILARITY_THRESHOLD", str(SIMILARITY_THRESHOLD))
)

# Category columns — names must match the published dataset exactly.
CATEGORIES = [
    "gender",
    "religional",
    "caste",
    "religion",
    "appearence",
    "socialstatus",
    "amiguity",
    "political",
    "Age",
    "Disablity",
]

QUOTAS = {
    "gender": 15,
    "caste": 12,
    "religional": 12,
    "religion": 10,
    "appearence": 10,
    "socialstatus": 10,
    "Age": 8,
    "Disablity": 8,
    "political": 12,
    "amiguity": 15,
}
NON_BIASED_TARGET = 20
