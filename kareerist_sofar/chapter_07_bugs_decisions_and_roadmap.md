# Chapter 7 — Bugs Fixed, Decisions Made & What's Next

## Part A: Major Bugs & Fixes Log

This section chronicles every significant issue encountered and how it was resolved.

---

### Bug 1: Backend ECONNREFUSED on OAuth Callback
**Symptom**: Google OAuth login failed. Frontend callback page got `ECONNREFUSED` when POSTing to `/api/v1/auth/oauth/session`.

**Root Cause**: The Vite proxy target was hardcoded to `http://localhost:8000`. In WSL2, `localhost` from a Windows Node process doesn't always resolve to the WSL network interface.

**Fix**: 
- `run.sh` now detects the WSL IP: `WSL_IP=$(hostname -I | awk '{print $1}')`
- Writes it to `FRONTEND/.env.local` as `VITE_WSL_IP`
- `vite.config.ts` reads this and sets the proxy target dynamically

---

### Bug 2: CSRF Middleware Breaking All Requests
**Symptom**: After adding a custom CSRF `Origin` header validator middleware, all API requests started failing with 403 — including legitimate ones from the Vite proxy.

**Root Cause**: The Vite proxy, when `changeOrigin: true` is set, rewrites the `Origin` header from `localhost:8080` to the backend host. The CSRF middleware then rejected it as an unknown origin.

**Fix (Part 1)**: Removed `changeOrigin: true` from the Vite proxy config. Added a comment explaining why it must stay absent:
```typescript
proxy: {
    "/api": {
        target: backendTarget,
        // Do NOT use changeOrigin:true — it rewrites Origin header
        // from "localhost:8080" to the backend host, breaking CSRF origin checks
    }
}
```

**Fix (Part 2)**: Removed the custom CSRF middleware entirely from `main.py`. The reasoning: CSRF protection is already provided by `SameSite=Lax` cookies. A browser will never attach `SameSite=Lax` cookies on cross-site requests initiated by a third-party page. The middleware was redundant and caused more harm than good.

---

### Bug 3: Backend Crashing on WSL Shell Transition
**Symptom**: Backend process died intermittently when the WSL terminal was closed or transitioned between sessions.

**Root Cause**: Without `setsid`, the backend process was a child of the shell that launched it. When the shell received SIGHUP (on session end), all its children were killed.

**Fix**: Wrapped the uvicorn start command in `setsid`:
```bash
setsid .venv/bin/python3 -m uvicorn app.main:app ...
```
`setsid` creates a new process group, detaching the backend.

---

### Bug 4: Health Check Timing Out on Cold Start
**Symptom**: `run.sh` sometimes reported the backend as not healthy even though it was still starting up (Supabase + Redis client initialization takes time on first boot).

**Root Cause**: The original health check only waited 3 seconds with 3 retries.

**Fix**: Expanded to 10 retries × 2 seconds = 20 seconds max wait. Also added a dead-process check:
```bash
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend process died! Last 15 lines of backend.log:"
    tail -n 15 backend.log
    exit 1
fi
```

---

### Bug 5: Interview Sessions Lost on Server Restart
**Symptom**: If the backend restarted mid-interview, the session was lost and users got "No active interview session found."

**Root Cause**: Sessions were stored in a Python `dict` (`active_sessions: Dict[str, InterviewSession]`) in-memory. Restarting the process wiped it.

**Fix**: Migrated session storage to **Redis** with a 45-minute TTL:
```python
await save_session(user_id_str, session)   # Serializes to JSON → Redis
session = await load_session(user_id_str)  # Redis → deserializes from JSON
await delete_session(user_id_str)          # Explicit cleanup on interview end
```

---

### Bug 6: Cover Letter PDF Had Rendering Artifacts
**Symptom**: Cover letters with `&`, `<`, or `>` characters caused ReportLab to render corrupted PDF paragraphs.

**Root Cause**: ReportLab's `Paragraph` element interprets those characters as HTML markup.

**Fix**: HTML-escape before passing to ReportLab:
```python
safe_line = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
```

---

### Bug 7: Markdown Asterisks in Cover Letters
**Symptom**: Generated cover letters sometimes contained `**bold**` or `*italic*` asterisks despite instructions to avoid them.

**Root Cause**: LLMs sometimes ignore formatting instructions, especially at higher temperatures.

**Fix**: Post-processing strip:
```python
clean = clean.replace("*", "")
```
Also added `<think>...</think>` tag stripping (for reasoning models):
```python
clean = re.sub(r"<think>.*?</think>", "", clean, flags=re.DOTALL).strip()
```

---

### Bug 8: ATS Score Wildcard CORS + Credentials
**Symptom**: Security audit flagged `CORS_ORIGINS = "*"` combined with `allow_credentials=True`.

**Root Cause**: This combination is invalid per the CORS spec — browsers reject credentialed requests to wildcard origins. Additionally, it's a security vulnerability.

**Fix**: Replaced with strict origin whitelist loaded from `settings.CORS_ORIGINS`. Added production validator to refuse startup with `*`.

---

## Part B: Key Architectural Decisions & Why

| Decision | Why |
|---|---|
| HttpOnly cookies for JWTs | Prevents XSS token theft — no JavaScript can read HttpOnly cookies |
| Vite proxy (no direct CORS) | Avoids CORS complexity in dev; single origin to the browser |
| Redis for interview state | Stateless backend — survives restarts, scales horizontally |
| Groq over OpenAI | 10x faster inference, generous free tier, same quality for this use case |
| HuggingFace for embeddings | Superior semantic matching vs keyword matching for ATS scoring |
| ReportLab for PDF generation | No external service dependency — PDFs generated in-process |
| Supabase over custom auth | Complete auth system (OAuth, PKCE, JWT) + DB + storage in one service |
| SlowAPI over custom rate limiting | Battle-tested, Redis-backed, minimal code overhead |
| `pydantic_settings` for config | Type-safe, validates at startup, reads from `.env` automatically |
| `uv` over `pip` | 10-100x faster package installation |

---

## Part C: What's Next (Roadmap)

### Immediate (P0 — Before Any Public Launch)
- [ ] **Render cold start UX** — Add "Waking up server..." indicator on first load
- [ ] **VITE_API_BASE_URL support** — Update `api.ts` to use env var in production (no proxy)
- [ ] **Supabase RLS (Row Level Security)** — Add Postgres policies as a DB-level IDOR backstop
- [ ] **Email verification enforcement** — Currently signup succeeds without verifying email

### High Priority (P1)
- [ ] **Resume versioning** — Let users upload multiple versions and compare scores
- [ ] **Job application tracker** — Kanban board: Applied → Interview → Offer → Rejected
- [ ] **Interview history** — Save past interview reports to Supabase for later review
- [ ] **Cover letter templates** — Multiple tone options (formal, creative, concise)
- [ ] **Cron ping for Render** — Keep backend alive on free tier

### Medium Priority (P2)
- [ ] **LinkedIn import** — Parse LinkedIn PDF export as an alternative to manual upload
- [ ] **Salary insights** — Integrate a public salary API for role-based ranges
- [ ] **Audio interview mode** — Use gTTS (already in requirements) to read questions aloud
- [ ] **Multi-language support** — Expand beyond Hinglish to full regional language support
- [ ] **Analytics dashboard** — Track improvement over multiple resume versions

### Nice to Have (P3)
- [ ] **Mobile app** — React Native wrapper around the core features
- [ ] **Resume builder** — In-app resume editor that outputs a well-formatted PDF
- [ ] **Company research** — Auto-pull company info when entering company name in cover letter
- [ ] **Referral system** — Users invite friends for extra AI credits

---

## Part D: File Reference Map

Quick lookup for where things live:

| What you're looking for | File |
|---|---|
| App startup & middleware | `backend/app/main.py` |
| All settings & config | `backend/app/core/config.py` |
| Cookie management | `backend/app/core/auth_cookies.py` |
| Rate limiting | `backend/app/core/rate_limit.py` |
| CSRF logic (removed) | `backend/app/core/csrf.py` |
| Auth endpoints | `backend/app/api/v1/endpoints/auth.py` |
| Resume upload/delete | `backend/app/api/v1/endpoints/resumes.py` |
| ATS match + Deep Roast | `backend/app/api/v1/endpoints/ai_analysis.py` |
| Cover letter + humanize | `backend/app/api/v1/endpoints/cover_letter.py` |
| Interview flow | `backend/app/api/v1/endpoints/interview.py` |
| Dashboard summary | `backend/app/api/v1/endpoints/dashboard.py` |
| Deep Roast LLM logic | `backend/app/services/resume_analyzer.py` |
| ATS math engine | `backend/app/services/math_engine.py` |
| General ATS scorer | `backend/app/services/ats_general_engine.py` |
| Cover letter generator | `backend/app/services/cover_letter_gen.py` |
| Humanizer | `backend/app/services/humanizer.py` |
| Interview AI | `backend/app/services/ai_interview.py` |
| Supabase client | `backend/app/db/supabase.py` |
| Redis client | `backend/app/db/redis_client.py` |
| Pydantic schemas | `backend/app/schemas/models.py` |
| Frontend routing | `FRONTEND/src/App.tsx` |
| Auth context | `FRONTEND/src/contexts/AuthContext.tsx` |
| API client | `FRONTEND/src/lib/api.ts` |
| Vite proxy config | `FRONTEND/vite.config.ts` |
| Dashboard UI | `FRONTEND/src/pages/DashboardPage.tsx` |
| Resume analysis UI | `FRONTEND/src/pages/ResumeAnalysis.tsx` |
| Cover letter UI | `FRONTEND/src/pages/CoverLetter.tsx` |
| Interview UI | `FRONTEND/src/pages/AIInterview.tsx` |
| OAuth callback UI | `FRONTEND/src/pages/AuthCallback.tsx` |
| Service launcher | `prsnl/run.sh` |
| Security audit report | `prsnl/qa_security_report.md` |
| Deployment guide | `prsnl/DEPLOYMENT_GUIDE.md` |
