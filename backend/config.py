"""Application configuration loaded from environment variables."""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

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
