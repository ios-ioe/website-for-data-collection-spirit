# Backend (HF Space)

FastAPI service for duplicate detection, PII scanning, and organizer QA batch.

See the root [README](../README.md) for full setup instructions.

## Local development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in Supabase credentials
uvicorn app:app --reload --port 7860
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + config status |
| POST | `/check-submission` | Live duplicate + PII warning check |

## Structure

```
backend/
├── app.py              # FastAPI entry
├── config.py           # Environment + quotas
├── database.py         # Supabase client
├── routers/
│   ├── health.py       # Health endpoint
│   └── submission.py   # Check-submission endpoint
├── models/
│   └── schemas.py      # Pydantic models
├── services/
│   ├── duplicate_service.py
│   └── pii_service.py
└── utils/
    └── exceptions.py   # Application exceptions
```
