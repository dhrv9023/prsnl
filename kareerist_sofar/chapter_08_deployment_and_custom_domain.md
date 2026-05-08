# Chapter 8 — Deployment: Free Tier & Custom Domain

## Overview

This chapter covers two scenarios:
1. **Free deployment** — Get Kareerist live on the internet for ₹0 / $0
2. **Custom domain** — Wire up `kareerist.com` (or any domain you own) after going live

---

# PART A — Free Deployment (₹0 / $0)

## Services Used

| Service | What it hosts | Free limit |
|---|---|---|
| **Vercel** | Frontend (React/Vite) | 100 GB bandwidth/mo, unlimited deploys |
| **Render** | Backend (FastAPI) | 750 hrs/mo, 512 MB RAM |
| **Supabase** | DB + Auth + Storage | 500 MB DB, 1 GB storage |
| **Upstash** | Redis (rate limit + sessions) | 10,000 commands/day |
| **Groq** | LLM inference | 6,000 tokens/min free |
| **HuggingFace** | Embeddings API | Free inference tier |

Total cost: **$0**

---

## Step-by-Step: Free Deployment

### Step 1 — Prepare Your Repo

Make sure these are in your `.gitignore` before pushing:
```
prsnl/backend/app/.env
prsnl/backend/.venv/
prsnl/backend/backend.log
prsnl/FRONTEND/node_modules/
prsnl/FRONTEND/.env.local
prsnl/FRONTEND/dist/
```

Push to GitHub:
```bash
git add .
git commit -m "chore: ready for deployment"
git push origin main
```

---

### Step 2 — Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com) → Sign up free
2. **Create Database** → Name: `kareerist-redis` → Region: pick closest (e.g., `ap-south-1` for India) → **Free tier**
3. After creation, open the database → scroll to **Connect** → copy the **Redis URL**:
   ```
   rediss://default:PASSWORD@ENDPOINT.upstash.io:6379
   ```
   > ⚠️ Note `rediss://` (with double `s`) — this is TLS-encrypted, required for Upstash

4. Save this URL for Step 3.

---

### Step 3 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **Sign in with GitHub**
2. **New +** → **Web Service**
3. Select your repository → click **Connect**

**Configure the service:**
```
Name:            kareerist-backend
Root Directory:  prsnl/backend
Environment:     Python 3
Build Command:   pip install -r requirements.txt
Start Command:   uvicorn app.main:app --host 0.0.0.0 --port 10000
Instance Type:   Free
```

> ⚠️ Render free tier uses port `10000`, not `8000`. The `--port 10000` in the start command is mandatory.

**Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

```
PROJECT_NAME           Kareerist Studio
ENVIRONMENT            production
API_V1_STR             /api/v1
SUPABASE_URL           https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE  eyJ...  (service_role key from Supabase)
SUPABASE_ANON_KEY      eyJ...  (anon key from Supabase)
SUPABASE_JWT_SECRET    your-jwt-secret (from Supabase → Settings → API)
GROQ_API_KEY           gsk_...
HUGGINGFACE_API_KEY    hf_...
REDIS_URL              rediss://default:...@....upstash.io:6379
COOKIE_SECURE          True
COOKIE_SAMESITE        lax
CORS_ORIGINS           https://kareerist-frontend.vercel.app
MIN_PASSWORD_LENGTH    8
RATE_LIMIT_AUTH        5/minute
RATE_LIMIT_UPLOAD      5/day
RATE_LIMIT_ANALYSIS    2/hour
RATE_LIMIT_COVER_LETTER 2/hour
RATE_LIMIT_INTERVIEW   2/hour
MAX_UPLOAD_BYTES       5242880
```

Click **Create Web Service** → wait ~5 minutes for the build.

After deploy, your backend URL will be:
```
https://kareerist-backend.onrender.com
```
Test it: open `https://kareerist-backend.onrender.com/health` in browser — should return `{"status":"ok",...}`.

---

### Step 4 — Deploy Frontend on Vercel

#### 4a. Update `api.ts` for Production

In development, the Vite proxy handles `/api/...` → backend. In production on Vercel, there's no Vite proxy. You need to update `FRONTEND/src/lib/api.ts`:

```typescript
// Replace this line:
const BASE = "/api/v1";

// With this:
const BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
```

And similarly for the interview base:
```typescript
const INTERVIEW_BASE = `${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/interview`.replace("/v1/interview", "/v1/interview");
// Simpler approach — just use:
const INTERVIEW_BASE = `${import.meta.env.VITE_API_BASE_URL?.replace("/v1", "") ?? ""}/api/v1/interview`;
```

> This makes the API base configurable via env var while keeping `/api/v1` as the dev fallback.

#### 4b. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign in with GitHub**
2. **Add New Project** → Import your repository
3. **Configure:**
   ```
   Framework Preset:  Vite
   Root Directory:    prsnl/FRONTEND
   Build Command:     npm run build   (auto-detected)
   Output Directory:  dist            (auto-detected)
   ```
4. **Add Environment Variables:**
   ```
   VITE_SUPABASE_URL       https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY  eyJ...
   VITE_API_BASE_URL       https://kareerist-backend.onrender.com/api/v1
   ```
5. Click **Deploy** → wait ~2 minutes

Your frontend URL will be:
```
https://kareerist-frontend.vercel.app
```

---

### Step 5 — Wire Everything Together

#### 5a. Update CORS on Render
Go to Render → Your Backend → **Environment** tab → update:
```
CORS_ORIGINS = https://kareerist-frontend.vercel.app
```
Save → Render auto-redeploys (~2 min).

#### 5b. Update Supabase Auth
Go to your [Supabase Dashboard](https://supabase.com) → **Authentication** → **URL Configuration**:

| Field | Value |
|---|---|
| Site URL | `https://kareerist-frontend.vercel.app` |
| Redirect URLs | `https://kareerist-frontend.vercel.app/**` |

#### 5c. Update Google OAuth (if using Google Sign-In)
Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials** → Edit your OAuth 2.0 Client ID:

- **Authorized JavaScript origins**: Add `https://kareerist-frontend.vercel.app`
- **Authorized redirect URIs**: Add the Supabase callback URL
  (found at Supabase → Auth → Providers → Google → Callback URL, looks like `https://xxxxx.supabase.co/auth/v1/callback`)

---

### Step 6 — Keep Render Alive (Free Tier Trick)

Render's free tier **spins down after 15 minutes of inactivity**. The first request after idle takes ~30 seconds. To prevent this:

**Option A — Use cron-job.org (Free)**
1. Go to [cron-job.org](https://cron-job.org) → Create free account
2. Create a new cron job:
   - URL: `https://kareerist-backend.onrender.com/health`
   - Schedule: Every 14 minutes
   - Method: GET
3. Enable it → your backend stays warm 24/7 for free

**Option B — Frontend "warming" indicator**
Add a small loading state if the backend takes > 5s to respond on first load.

---

## Free Tier Limits Summary

| Service | Limit | What happens when exceeded |
|---|---|---|
| Render (compute) | 750 hrs/mo (~31 days for 1 service) | Service paused until next month |
| Upstash Redis | 10,000 commands/day | Requests fail (429 from Redis) |
| Supabase DB | 500 MB storage | Writes blocked |
| Supabase Storage | 1 GB | Uploads blocked |
| Groq | 6,000 tokens/min, 500,000/day | API returns 429 |
| Vercel bandwidth | 100 GB/mo | Site goes down |

For a portfolio/demo project, these limits are **very comfortable**. You'd need hundreds of active daily users to hit them.

---

---

# PART B — After You Get a Custom Domain

Once you own a domain (e.g., `kareerist.in`, `kareerist.com`), here's every change you need to make.

## Assumed Setup
- Domain purchased (e.g., from GoDaddy, Namecheap, Google Domains, Hostinger)
- Frontend on Vercel → will become `kareerist.com`
- Backend on Render → will become `api.kareerist.com`

---

## Step 1 — Add Domain to Vercel (Frontend)

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add `kareerist.com` and `www.kareerist.com`
3. Vercel shows you DNS records to add:
   ```
   Type: A       Name: @     Value: 76.76.21.21
   Type: CNAME   Name: www   Value: cname.vercel-dns.com
   ```
4. Go to your domain registrar's DNS settings → add these records
5. Wait 5–30 minutes for propagation
6. Vercel auto-provisions a free SSL certificate via Let's Encrypt ✅

---

## Step 2 — Add Subdomain to Render (Backend)

1. Render Dashboard → Your Backend Service → **Settings** → **Custom Domains**
2. Add `api.kareerist.com`
3. Render shows you a CNAME record:
   ```
   Type: CNAME   Name: api   Value: kareerist-backend.onrender.com
   ```
4. Add this to your domain registrar's DNS
5. Wait for propagation → Render auto-provisions SSL ✅

---

## Step 3 — Update All Environment Variables

### On Render (Backend)
Update these env vars:
```
CORS_ORIGINS = https://kareerist.com,https://www.kareerist.com
```
> Comma-separate if you want both www and non-www to work.

### On Vercel (Frontend)
Update the API base URL:
```
VITE_API_BASE_URL = https://api.kareerist.com/api/v1
```
Vercel → Project → Settings → Environment Variables → edit → **Redeploy**.

---

## Step 4 — Update Supabase Auth URLs

In [Supabase Dashboard](https://supabase.com) → **Authentication** → **URL Configuration**:

| Field | Old Value | New Value |
|---|---|---|
| Site URL | `https://kareerist-frontend.vercel.app` | `https://kareerist.com` |
| Redirect URLs | `https://kareerist-frontend.vercel.app/**` | `https://kareerist.com/**` |

> Keep the old Vercel URL in Redirect URLs too (as a fallback) during the transition.

---

## Step 5 — Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com) → Credentials → Edit OAuth 2.0 Client:

**Authorized JavaScript origins** — add:
```
https://kareerist.com
https://www.kareerist.com
```

**Authorized redirect URIs** — the Supabase callback URL doesn't change (it's on Supabase's domain), so this stays the same. But double-check it's still there:
```
https://xxxxx.supabase.co/auth/v1/callback
```

---

## Step 6 — Update Cookie Settings

With a real domain and HTTPS confirmed, update Render env vars:

```
COOKIE_SECURE    = True      (already set — confirm it's True)
COOKIE_SAMESITE  = lax       (keep as lax — works for same-site)
AUTH_COOKIE_DOMAIN = .kareerist.com   (optional — allows sharing across subdomains)
```

> Setting `AUTH_COOKIE_DOMAIN = .kareerist.com` (note the leading dot) allows the cookie to be sent from `kareerist.com` to `api.kareerist.com`. This is useful if you ever move the frontend and backend to the same parent domain.

---

## Step 7 — Enable HSTS Preload (Optional but Recommended)

Once your domain has been on HTTPS for 60+ days, submit it to the [HSTS Preload List](https://hstspreload.org/). The backend already sends the correct header:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Submitting to the preload list means browsers will **never** make an HTTP request to your domain — it's hardcoded HTTPS-only.

---

## Full Domain Transition Checklist

```
□ Add kareerist.com to Vercel → DNS A record added → SSL confirmed
□ Add api.kareerist.com to Render → DNS CNAME added → SSL confirmed
□ CORS_ORIGINS updated on Render → includes kareerist.com
□ VITE_API_BASE_URL updated on Vercel → points to api.kareerist.com
□ Vercel redeployed after env var change
□ Supabase Site URL updated to kareerist.com
□ Supabase Redirect URLs updated to kareerist.com/**
□ Google OAuth JS origins updated
□ Test full auth flow (email/password + Google OAuth)
□ Test resume upload
□ Test Deep Roast
□ Test Cover Letter generation
□ Test AI Interview
□ Old Vercel URL still works (Vercel keeps it active automatically)
□ (Optional) Set up www → non-www redirect in Vercel
□ (Optional) Submit to HSTS preload list after 60 days
```

---

## DNS Records Summary (Both Phases)

### Phase 1 (Free, no custom domain)
No DNS changes needed. Use the auto-generated URLs:
- Frontend: `https://kareerist-xxx.vercel.app`
- Backend: `https://kareerist-backend.onrender.com`

### Phase 2 (Custom domain)

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `@` | `76.76.21.21` | Vercel frontend root |
| CNAME | `www` | `cname.vercel-dns.com` | Vercel www redirect |
| CNAME | `api` | `kareerist-backend.onrender.com` | Render backend |

---

## Cost After Adding Domain

| Item | Cost |
|---|---|
| Domain registration (e.g., .in from Hostinger) | ~₹600–₹800/year |
| Vercel | Free |
| Render | Free |
| Supabase | Free |
| Upstash | Free |
| Groq | Free |
| HuggingFace | Free |
| **Total** | **~₹600–₹800/year** |

For a production app with real users, upgrading Render to a paid plan ($7/month) eliminates cold starts and gives you always-on uptime.
