# Deployment Bugs — Status Tracker

> Originally documented as bugs to fix before production deployment.
> Updated May 2026 after pre-launch audit — all 5 bugs are now fixed in code.

---

## ✅ 1. Rate Limiting Proxy Misconfiguration — FIXED

**Where:** `backend/app/core/rate_limit.py` + `backend/app/main.py`

**Problem:** The rate limiter read `request.client.host` directly, ignoring `X-Forwarded-For`. Behind Render's proxy, ALL users shared the proxy's IP.

**Fix Applied:**
- `_get_real_client_ip()` now reads `CF-Connecting-IP` / `X-Forwarded-For` / `X-Real-IP` in production
- `ProxyHeadersMiddleware` added to `main.py` for production

```python
# main.py
if _is_prod:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
```

---

## ✅ 2. Production API Routing Hardcoded to Localhost — FIXED

**Where:** `FRONTEND/src/lib/api.ts`

**Problem:** `const BASE = "/api/v1"` worked via Vite proxy locally but 404'd on Vercel.

**Fix Applied:**
```typescript
const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = `${API_BASE}/api/v1`;
const INTERVIEW_BASE = `${API_BASE}/api/v1/interview`;
```

**Deployment action still needed:** Set `VITE_API_BASE=https://your-backend.onrender.com` in Vercel environment variables.

---

## ✅ 3. Credit System — IMPLEMENTED

**Where:** Full-stack feature

**Problem (original):** No credit tracking — rate limits were the only paywall.

**Fix Applied:** Complete credit system built:
- `SUPABASE_MIGRATION.sql` — profiles columns, credit_transactions table, ip_credit_claims, `grant_credits` RPC, `deduct_credits` RPC, signup trigger
- `backend/app/services/credits.py` — `deduct_feature_credits()`, `admin_grant_credits()`
- `backend/app/api/dependencies.py` — `require_credits()` FastAPI dependency
- `backend/app/api/v1/endpoints/credits.py` — balance, costs, validate, history endpoints
- `backend/app/api/v1/endpoints/admin.py` — grant credits, set unlimited, user management
- `FRONTEND/src/contexts/CreditContext.tsx` — balance state, `canUse()`, `deductLocal()`, `refresh()`
- `FRONTEND/src/components/ui/CreditBadge.tsx` — navbar balance display
- `FRONTEND/src/components/ui/CreditDisplay.tsx` — `FeatureCostTag`, `InsufficientCreditsWarning`
- `FRONTEND/src/pages/CreditsPage.tsx` — balance, history, buy credits (coming soon)
- `FRONTEND/src/pages/AdminPage.tsx` — admin panel with credit management

**Still needed:** Payment integration (Razorpay/Stripe) for the "Buy Credits" tab.

---

## ✅ 4. Application Blank Screen via Content Security Policy — FIXED

**Where:** `backend/app/main.py` — `SecurityHeadersMiddleware`

**Problem:** `default-src 'none'; frame-ancestors 'none';` blocked all scripts and connections.

**Fix Applied:** Environment-aware CSP:
- Production: allows `'self'`, Google Fonts, Supabase CDN
- Development: relaxed to allow Vite HMR (`ws:`, `wss:`, `'unsafe-eval'`)

---

## ✅ 5. Local Dev Scripts Crashing Production Containers — DOCUMENTED

**Where:** `run.sh`

**Problem:** `run.sh` uses WSL-specific commands (`hostname -I`, `setsid`) that don't exist in Render's Docker containers.

**Fix Applied:** Added documentation header to `run.sh`:
```bash
# ⚠️  PRODUCTION DEPLOYMENT (Render):
#     Do NOT use this script in production. Set the Render start command to:
#       uvicorn app.main:app --host 0.0.0.0 --port $PORT
#     Working directory: backend/
```

**Deployment action still needed:** Set Render start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

---

## Deployment Day Checklist (Updated)

- [x] Add `ProxyHeadersMiddleware` for rate limiting behind proxy ✅
- [x] Make `BASE` and `INTERVIEW_BASE` in `api.ts` environment-aware ✅
- [x] Implement global AI credit system ✅
- [x] Write a valid production CSP header ✅
- [ ] Set Render start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Set `VITE_API_BASE=https://your-backend.onrender.com` in Vercel
- [ ] Run `SUPABASE_MIGRATION.sql` in Supabase SQL Editor
- [ ] Run `backend/SUPABASE_MIGRATION_interview_reports.sql` in Supabase SQL Editor
- [ ] Set `ENVIRONMENT=production`, `COOKIE_SECURE=True`, `CORS_ORIGINS=<vercel-url>` on Render
- [ ] Test all flows end-to-end after deployment
