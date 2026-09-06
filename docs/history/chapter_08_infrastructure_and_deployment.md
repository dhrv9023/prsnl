# Chapter 08 — Infrastructure & Deployment

## Services Overview

| Service | Platform | Tier | Purpose |
|---------|----------|------|---------|
| Frontend | Vercel | Free | React app hosting |
| Backend | Render | Free | FastAPI server |
| Database | Supabase | Free | PostgreSQL + Auth + Storage |
| Redis | Upstash | Free | Rate limiting + interview sessions |
| Monitoring | Sentry | Free | Error tracking |

---

## Backend — Render

**Auto-deploy:** Every push to `main` branch triggers a new deploy.

**Start command:**
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Working directory:** `backend/`

**Environment variables (required in production):**
```
ENVIRONMENT=production
GROQ_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
SUPABASE_ANON_KEY=...
SUPABASE_JWT_SECRET=...
HUGGINGFACE_API_KEY=...
REDIS_URL=rediss://...  (Upstash URL with TLS)
CORS_ORIGINS=https://kareerist.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
SENTRY_DSN=...
```

**Cold start problem:** Render's free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~20-30 seconds. Mitigated by:
1. UptimeRobot pinging `/ping` every 10 minutes
2. Cold start banner in the frontend (shows after 4 seconds of loading)

**Health check:** Render pings `/health` to verify the service is up. The `/health` endpoint checks both Redis and Supabase connectivity.

---

## Frontend — Vercel

**Auto-deploy:** Every push to `main` branch triggers a new deploy.

**Build command:** `npm run build`

**Output directory:** `dist/`

**Environment variables (required):**
```
VITE_API_BASE=https://your-backend.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

**`vercel.json`:** Configures SPA routing — all paths serve `index.html` so React Router handles navigation.

**Stale chunk handling:** After a new deploy, old JavaScript chunks are invalidated. The `lazyWithRetry()` wrapper in `App.tsx` detects chunk load failures and reloads the page once to fetch fresh chunks.

---

## Database — Supabase

**PostgreSQL** hosted by Supabase. All schema changes are in `supabase/migrations/`.

**Auth:** Supabase handles email/password auth and Google OAuth. The backend uses the service role key to bypass RLS for all operations.

**Storage:** `Resumes` bucket stores uploaded PDF files. Files are stored at `{user_id}/{timestamp}_{filename}.pdf`.

**Running migrations:** Paste each migration file into Supabase SQL Editor and run in order. There's no automated migration runner — it's manual.

---

## Redis — Upstash

Upstash provides serverless Redis with a `rediss://` URL (TLS). Used for:
1. **Rate limiting** — SlowAPI stores counters in Redis so limits persist across Render restarts and are shared across workers
2. **Interview sessions** — `interview:session:{user_id}` keys with 45-minute TTL

The Redis client auto-reconnects after outages (pings on every `get_redis()` call and recreates the client if the ping fails).

---

## Sentry

Error monitoring for both backend and frontend.

**Backend:** Initialized in `main.py` before the app is created. Captures all unhandled exceptions. `send_default_pii=False` — never sends user PII to Sentry. 10% of requests are traced.

**Frontend:** Initialized in `main.tsx`. Captures JavaScript errors and unhandled promise rejections.

Set `SENTRY_DSN` in Render environment variables to enable.

---

## Local Development

```bash
# From project root
bash run.sh
```

`run.sh` does:
1. Checks for Redis, installs if missing, starts it
2. Creates Python venv if needed, installs deps
3. Starts Uvicorn on port 8000
4. Detects WSL2 IP, writes it to `FRONTEND/.env.local`
5. Starts Vite dev server on port 8080

The Vite dev server proxies all `/api` requests to `http://{WSL_IP}:8000`. This handles the WSL2 networking quirk where `localhost` in the browser doesn't reach the WSL2 backend.

**Dev bypass:** Set `DEV_BYPASS_USER_ID=<your-supabase-uuid>` in `backend/app/.env`. The frontend sends `X-Dev-Bypass: 1` on every request in dev mode, which skips auth and credit deduction entirely.

---

## Deployment Checklist

Before deploying to production:

- [ ] All migrations applied to Supabase (in order)
- [ ] Render env vars set: `ENVIRONMENT=production`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `CORS_ORIGINS=https://...`
- [ ] Vercel env vars set: `VITE_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] Sentry DSN set in Render
- [ ] UptimeRobot configured to ping `/ping` every 10 minutes
- [ ] Google OAuth redirect URI includes `https://your-frontend.vercel.app/auth/callback`
