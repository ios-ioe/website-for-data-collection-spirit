# Nepali Bias Data Collection Tool

Production-quality internal platform for a one-day data collection competition. Teams log in with an access code, submit Nepali sentences labeled across 10 bias categories, and track their own quota progress in real time. Organizers get an admin-only leaderboard and review panel, QA batch processing, and JSON export.

```
React (Vercel)  ──signed session token──▶  HF Space (FastAPI, holds service key)  ──▶  Supabase (Postgres)
```

| Layer | Role |
|-------|------|
| **Frontend** | Login, submit, dashboard, admin — talks only to the backend, never to Supabase directly |
| **HF Space backend** | Auth (access code / admin password), all submission reads & writes, duplicate detection, PII scanning, organizer QA batch, leaderboard |
| **Supabase** | PostgreSQL database — RLS has no anon policies; only the backend's service role key can read or write |

The **service role key** and **session-signing secret** live only in the Hugging Face Space. Neither ever ships to the browser. Team and admin sessions are signed, short-lived tokens minted only by `/login` and `/admin/login` — the frontend never sends a `team_id` that the backend trusts blindly, and a team can only ever see or write its own rows. The public leaderboard has been removed; only an authenticated admin session can see team rankings (see `/admin/leaderboard`).

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
│   ├── database.py         # Supabase client + query helpers
│   ├── routers/
│   │   ├── health.py       # Health endpoint
│   │   ├── auth.py         # /login, /admin/login — the only places that mint tokens
│   │   ├── submission.py   # /check-submission, /submit, /my-submissions, /my-count
│   │   └── admin.py        # /admin/* — leaderboard, full table, QA batch, export
│   ├── models/
│   │   └── schemas.py      # Pydantic request/response models
│   ├── services/           # duplicate, PII, QA batch
│   └── utils/
│       ├── auth.py         # signed session token issuing/verification
│       └── exceptions.py   # Application exceptions
│   ├── Dockerfile          # HF Space deployment
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/     # Nav, ProgressBar, Toast, Dialog, Skeleton, etc.
    │   ├── pages/          # Login, Submit, Dashboard, Admin (leaderboard is a tab inside Admin)
    │   ├── context/        # Team session + Toast notifications
    │   ├── config/         # Quotas and category definitions
    │   └── lib/            # api.js — the single client for all backend calls
    ├── vercel.json         # SPA routing for Vercel
    └── package.json
```

---

## Environment variables

### Frontend (`frontend/.env` or Vercel)

| Variable | Description |
|----------|-------------|
| `VITE_HF_SPACE_URL` | Hugging Face Space URL — the frontend talks only to this backend now |

### Backend (`backend/.env` or HF Space secrets)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **keep secret** |
| `MODEL_NAME` | Sentence-transformers model (default: `paraphrase-multilingual-MiniLM-L12-v2`) |
| `SIMILARITY_THRESHOLD` | Cosine similarity threshold for duplicate warnings (default: `0.90`) |
| `SESSION_SECRET` | Random secret used to sign team/admin session tokens — **required**, set to a long random string |
| `ADMIN_PASSWORD` | Organizer password, checked server-side only (replaces the old `VITE_ADMIN_PASSWORD`, which shipped in the browser bundle) |
| `SESSION_TTL_SECONDS` | How long a login stays valid (default: `72000` = 20h, covers a one-day event) |

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
2. Set `VITE_HF_SPACE_URL`.
3. Deploy (framework preset: Vite). `vercel.json` handles client-side routing.

---

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | Public | Access code → `POST /login` on the backend → signed team session token |
| `/submit` | Team | Sentence + 10 Yes/No labels + optional source metadata → `POST /submit` |
| `/dashboard` | Team | Own quota progress only, via `GET /my-submissions` / `GET /my-count` |
| `/admin` | Password (server-verified) | Submissions table, admin-only leaderboard tab, filters, QA batch, JSON export |

Team session token persists in `localStorage`; admin session token persists only for the browser tab (`sessionStorage`) and must be re-entered next visit. Both expire server-side after `SESSION_TTL_SECONDS`.

There is no public leaderboard route — team rankings are only visible under `/admin`, and each team's dashboard shows only that team's own data.

---

## Submission flow

1. User fills Nepali text + category labels → **Check & save**
2. Frontend calls `POST /check-submission` on the HF Space (advisory only, no auth required)
3. Warnings shown in a confirmation dialog (duplicate similarity, PII matches)
4. User confirms → frontend calls `POST /submit` with the team's session token; the backend reads `team_id` from the token (never from the request body) and inserts using the service role key
5. Success toast; form clears

**Warnings never block.** If the HF Space's check step is slow/unreachable, users can still save — `/submit` itself is a separate call. The organizer QA batch is the safety net.

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

In `/admin`, click **Export JSON** (calls `GET /admin/export`, admin token required). Output uses exact dataset column names:

`team_id`, `text`, `gender`, `religional`, `caste`, `religion`, `appearence`, `socialstatus`, `amiguity`, `political`, `Age`, `Disablity`, `source_platform`, `source_date`, `submitted_at`, `flag_duplicate`, `flag_pii`, `judge_reviewed`

Column names (including typos like `religional`, `appearence`, `amiguity`, `Disablity`) are intentional — they match the published dataset.

---

## Dry run before the event

1. Log in as 2–3 seeded teams in different browser tabs; submit ~10 rows each.
2. Submit the same sentence twice → confirm duplicate warning appears.
3. Include a phone number or common Nepali name → confirm PII warning appears.
4. Confirm each team's `/dashboard` only ever shows that team's own count — try editing localStorage/requests to claim a different team_id and confirm the backend still returns only the real one.
5. In `/admin`, log in with the organizer password, check the **Leaderboard** tab, run QA batch, and export JSON → verify field names and counts.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Blank screen on load | Check `VITE_HF_SPACE_URL` in `.env` or Vercel |
| Login fails | Re-run `seed.sql`; verify `verify_access_code` RPC exists; check backend logs for `SESSION_SECRET` missing |
| Check & save always fails | Verify `VITE_HF_SPACE_URL`; test `GET /health` on the Space |
| Submit succeeds but dashboard/count doesn't update | Session token may have expired (`SESSION_TTL_SECONDS`) — log in again |
| Admin won't unlock | Set `ADMIN_PASSWORD` in **backend** secrets (not a `VITE_` frontend var anymore) |
| Admin leaderboard/table empty | Confirm the admin token is present (log out and back in); check `/admin/submissions` directly |
| QA batch slow | Normal for large datasets; batch timeout is 120s |

---

## Screenshots

<!-- Add screenshots after deploy -->
- `docs/screenshots/login.png` — Team login
- `docs/screenshots/submit.png` — Submission form with warnings
- `docs/screenshots/dashboard.png` — Quota progress (own team only)
- `docs/screenshots/admin.png` — Admin table + leaderboard tab + QA report

---

## License

Internal event tool. Adjust quotas, team seeds, and PII name lists as needed for your event.
