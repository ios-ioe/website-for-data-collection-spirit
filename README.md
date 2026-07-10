# Nepali Bias Data Collection Tool

Production-quality internal platform for a one-day data collection competition. Teams log in with an access code, submit Nepali sentences labeled across 10 bias categories, and track quota progress in real time. Organizers get a live leaderboard, admin review panel, QA batch processing, and JSON export.

```
React (Vercel)  ──direct CRUD──▶  Supabase (Postgres + RLS + Realtime)
      │                                    ▲
      └──smart checks──▶  HF Space (FastAPI, holds service key) ──┘
```

| Layer | Role |
|-------|------|
| **Frontend** | Login, submit, dashboard, leaderboard, admin — talks to Supabase directly |
| **HF Space backend** | Duplicate detection + PII scanning + organizer QA batch |
| **Supabase** | PostgreSQL database with RLS, access-code login RPC, realtime |

The **service role key** lives only in the Hugging Face Space. It never ships to the browser.

---

## Folder structure

```
nepali-bias-data-tool/
├── supabase/
│   ├── schema.sql          # Full database schema — run in Supabase SQL editor
│   └── seed.sql            # Sample teams and access codes
├── backend/
│   ├── app.py              # FastAPI entry point
│   ├── config.py           # Environment configuration
│   ├── database.py         # Supabase client + pagination helpers
│   ├── routers/
│   │   └── health.py       # Health endpoint
│   ├── models/
│   │   └── schemas.py      # Pydantic request/response models
│   ├── services/           # duplicate, PII, QA batch (future)
│   └── utils/
│       └── exceptions.py   # Application exceptions
│   ├── Dockerfile          # HF Space deployment
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/     # Nav, ProgressBar, Toast, Dialog, Skeleton, etc.
    │   ├── pages/          # Login, Submit, Dashboard, Leaderboard, Admin
    │   ├── context/        # Team session + Toast notifications
    │   ├── config/         # Quotas and category definitions
    │   └── lib/            # Supabase client, HF API, submission helpers
    ├── vercel.json         # SPA routing for Vercel
    └── package.json
```

---

## Environment variables

### Frontend (`frontend/.env` or Vercel)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (RLS-protected) |
| `VITE_HF_SPACE_URL` | Hugging Face Space URL for `/check-submission` |
| `VITE_ADMIN_PASSWORD` | Soft password gate for `/admin` |

### Backend (`backend/.env` or HF Space secrets)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **keep secret** |
| `MODEL_NAME` | Sentence-transformers model (default: `paraphrase-multilingual-MiniLM-L12-v2`) |
| `SIMILARITY_THRESHOLD` | Cosine similarity threshold for duplicate warnings (default: `0.90`) |

Optional tuning: `FUZZ_PREFILTER_THRESHOLD`, `FUZZ_TOP_K`, `BATCH_SIMILARITY_THRESHOLD`.

---

## Setup

### 1. Supabase (~5 min)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste and run **`supabase/schema.sql`**.
3. Edit team names/codes in **`supabase/seed.sql`**, then run it.
4. From **Project → Settings → API**, copy:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only)

### 2. Hugging Face Space (~10 min)

1. Create a **Docker** Space (New Space → SDK: Docker).
2. Push the contents of **`backend/`** to it.
3. In Space → **Settings → Variables and secrets**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MODEL_NAME` (optional)
   - `SIMILARITY_THRESHOLD` (optional)
4. Wait for the build (model pre-downloads at build time).
5. Confirm `GET /health` returns `secrets_configured: true`.
6. Copy the Space URL → `VITE_HF_SPACE_URL`.

### 3. Frontend (~5 min)

**Local:**
```bash
cd frontend
cp .env.example .env   # fill in all VITE_ values
npm install
npm run dev             # http://localhost:5173
```

**Vercel:**
1. Import the `frontend/` folder.
2. Set all four `VITE_` environment variables.
3. Deploy (framework preset: Vite). `vercel.json` handles client-side routing.

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | Public | Access code → team session (via `verify_access_code` RPC) |
| `/submit` | Team | Sentence + 10 Yes/No labels + optional source metadata |
| `/dashboard` | Team | Quota progress, remaining units, completed categories |
| `/leaderboard` | Public | Live ranking with 18s polling + realtime fallback |
| `/admin` | Password | Submissions table, filters, QA batch, JSON export |

Team session persists in `localStorage` and survives page refresh.

---

## Submission flow

1. User fills Nepali text + category labels → **Check & save**
2. Frontend calls `POST /check-submission` on the HF Space
3. Warnings shown in a confirmation dialog (duplicate similarity, PII matches)
4. User confirms → row inserted into Supabase
5. Success toast; form clears

**Warnings never block.** If the HF Space is unreachable, users can still save. The organizer QA batch is the safety net.

---

## Quotas (hardcoded)

| Category | Target |
|----------|--------|
| gender | 15 |
| caste | 12 |
| religional | 12 |
| religion | 10 |
| appearence | 10 |
| socialstatus | 10 |
| Age | 8 |
| Disablity | 8 |
| political | 12 |
| amiguity | 15 |
| **Non-biased** (all zeros) | **20** |

Defined in `frontend/src/config/quotas.js` and `backend/config.py`.

---

## Export

In `/admin`, click **Export JSON**. Output uses exact dataset column names:

`team_id`, `text`, `gender`, `religional`, `caste`, `religion`, `appearence`, `socialstatus`, `amiguity`, `political`, `Age`, `Disablity`, `source_platform`, `source_date`, `submitted_at`, `flag_duplicate`, `flag_pii`, `judge_reviewed`

Column names (including typos like `religional`, `appearence`, `amiguity`, `Disablity`) are intentional — they match the published dataset.

---

## Dry run before the event

1. Log in as 2–3 seeded teams in different browser tabs; submit ~10 rows each.
2. Submit the same sentence twice → confirm duplicate warning appears.
3. Include a phone number or common Nepali name → confirm PII warning appears.
4. Open `/leaderboard` on a projector → confirm it updates.
5. In `/admin`, run QA batch and export JSON → verify field names and counts.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank screen on load | Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` or Vercel |
| Login fails | Re-run `seed.sql`; verify `verify_access_code` RPC exists |
| Check & save always fails | Verify `VITE_HF_SPACE_URL`; test `GET /health` on the Space |
| Leaderboard empty | Run `seed.sql`; confirm `teams_public` view exists |
| Admin won't unlock | Set `VITE_ADMIN_PASSWORD` in env vars |
| QA batch slow | Normal for large datasets; batch timeout is 120s |

---

## Screenshots

<!-- Add screenshots after deploy -->
- `docs/screenshots/login.png` — Team login
- `docs/screenshots/submit.png` — Submission form with warnings
- `docs/screenshots/dashboard.png` — Quota progress
- `docs/screenshots/leaderboard.png` — Live ranking
- `docs/screenshots/admin.png` — Admin table + QA report

---

## License

Internal event tool. Adjust quotas, team seeds, and PII name lists as needed for your event.
