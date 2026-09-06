# 🟡 Part 8: Medium & Low Severity Vulnerabilities

**Last Tested & Verified:** September 6, 2026 *(Platform Version 1.2.0, Commit `e051d84`)*  
**Previous Audit:** May 24, 2026  

---

## VULN-011 — 🟡 MEDIUM: Race Condition in Initial Credit Grant

**Severity:** MEDIUM  
**Category:** Race Condition / Credit Farming  
**File:** `backend/app/services/credits.py` (lines 84-144)

### Attack Scenario
The `grant_initial_credits` function performs a TOCTOU check:
1. Check if user already has credits (line 97-103)
2. Check if IP already claimed (line 107-117)
3. Grant credits via RPC (line 121)
4. Record IP claim (line 129)

Between steps 2 and 4, a second concurrent request can pass the IP check (no record yet) and also grant credits. Result: double initial grant (200 credits instead of 100).

### Impact
Credit farming — attackers can get 2× initial credits per account.

### Fix
```sql
-- The ip_credit_claims table already has ip as PRIMARY KEY.
-- Wrap the entire grant in a single atomic function:
CREATE OR REPLACE FUNCTION public.grant_initial_credits_atomic(
  p_user_id UUID,
  p_ip TEXT,
  p_amount INTEGER DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Attempt to insert IP claim (fails if IP already exists due to PK)
  INSERT INTO public.ip_credit_claims (ip, user_id, granted_amount)
  VALUES (p_ip, p_user_id, p_amount);

  -- If we get here, IP is new — grant credits
  PERFORM public.grant_credits(p_user_id, p_amount, 'initial_grant',
    jsonb_build_object('source', 'signup', 'ip', p_ip));
  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;  -- IP already claimed
END;
$$;
```

---

## VULN-012 — 🟡 MEDIUM: IDOR in Admin Credit History Endpoint

**Severity:** MEDIUM  
**Category:** IDOR (Insecure Direct Object Reference)  
**File:** `backend/app/api/v1/endpoints/admin.py` (lines 215-230)

### Attack Scenario
`GET /admin/users/{target_user_id}/credit-history` accepts any UUID as `target_user_id`. While the endpoint requires admin auth, it performs no validation that the `target_user_id` actually exists. An attacker with admin access can enumerate UUIDs.

More importantly, the `target_user_id` parameter is passed directly to the database query without format validation. While Supabase parameterizes queries, a malformed UUID could cause unexpected errors.

### Fix
```python
@router.get("/users/{target_user_id}/credit-history")
async def get_user_credit_history(target_user_id: str, user: CurrentUser):
    await _require_admin(user)

    # Validate UUID format
    import uuid
    try:
        uuid.UUID(target_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    # Verify target user exists
    supabase = await get_db()
    user_check = await supabase.table("profiles").select("id").eq("id", target_user_id).limit(1).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found")

    # ... rest of query
```

---

## VULN-013 — 🟡 MEDIUM: Unrestricted `is_admin` Column in Profile Update RLS

**Severity:** MEDIUM  
**Category:** Privilege Escalation  
**File:** `supabase/migrations/20260202140000_profiles_auth_sync.sql` (lines 142-148)

### Attack Scenario
The RLS policy `profiles_update_own` allows authenticated users to update ANY column in their own profile row, including `is_admin`, `is_unlimited`, `remaining_credits`, and `total_credits_granted`.

```sql
-- Current policy (too permissive):
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### Impact
Any user can grant themselves admin access or unlimited credits by updating their own profile row directly through the Supabase REST API.

### Fix
See VULN-008 fix in Part 7. The key is to either:
1. Add column-level restrictions to the WITH CHECK clause
2. Revoke direct UPDATE and use a security definer function for safe updates only

---

## VULN-014 — 🟡 MEDIUM: Analysis History Missing `user_id` Filter

**Severity:** MEDIUM  
**Category:** Broken Access Control  
**File:** `backend/app/api/v1/endpoints/ai_analysis.py` (lines 208-210)  
**Re-Test Status (September 6, 2026):** ✅ **RESOLVED**  
*Remediated: Added `.eq("user_id", str(user.id))` to the database query in `ai_analysis.py:214` to enforce tenant isolation.*

### Attack Scenario
```python
# Current code:
history_res = await supabase.table("ai_analyses").select("*") \
    .eq("resume_id", resume_id).order("created_at", desc=True).execute()
```
While resume ownership is checked first (line 203-206), the history query itself has no `user_id` filter. Since the service role is used, if `resume_id` UUIDs were ever shared or reused (edge case), analyses from other users could leak.

### Fix
```python
history_res = await supabase.table("ai_analyses").select("*") \
    .eq("resume_id", resume_id) \
    .eq("user_id", str(user.id)) \
    .order("created_at", desc=True).execute()
```

---

## VULN-015 — 🟡 MEDIUM: Dev Bypass Header Active Based on Single Env Var

**Severity:** MEDIUM  
**Category:** Authentication Bypass  
**File:** `backend/app/api/dependencies.py` (lines 29-35)

### Attack Scenario
If `ENVIRONMENT=development` is accidentally set in production (e.g., forgot to update env var), any request with `X-Dev-Bypass: 1` header completely skips authentication and uses `DEV_BYPASS_USER_ID`.

### Impact
Complete auth bypass — attacker can access any authenticated endpoint as the dev user.

### Fix
```python
# Add a second safety check — require BOTH environment AND a specific env var:
_DEV_BYPASS_ENABLED = (
    settings.ENVIRONMENT == "development"
    and _DEV_BYPASS_USER_ID
    and os.environ.get("ENABLE_DEV_BYPASS") == "1"  # Must be explicitly enabled
)

# In get_current_user:
if _DEV_BYPASS_ENABLED and request.headers.get("X-Dev-Bypass") == "1":
    ...
```

---

## VULN-016 — 🟡 MEDIUM: Permissions-Policy Blocks Microphone

**Severity:** MEDIUM (functional + security)  
**Category:** Misconfigured Security Header  
**File:** `backend/app/main.py` (line 54)  
**Re-Test Status (September 6, 2026):** ✅ **RESOLVED**  
*Remediated: Updated header to `Permissions-Policy: camera=(), microphone=(self), geolocation=()` in `main.py:54`, allowing microphone capture for voice mock interviews.*

### Attack Scenario
`Permissions-Policy: microphone=()` blocks ALL microphone access. The voice interview feature (`/submit_voice`) requires microphone access, making it non-functional when the backend's headers are applied.

### Fix
```python
response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
```

---

## VULN-017 — 🟡 MEDIUM: No Audio File Validation in Voice Upload

**Severity:** MEDIUM  
**Category:** Malicious File Upload  
**File:** `backend/app/api/v1/endpoints/interview.py` (lines 283-308)  
**Re-Test Status (September 6, 2026):** ✅ **RESOLVED**  
*Remediated: Implemented `ALLOWED_AUDIO_TYPES` MIME validation, extension allowlist, and 10MB bounds in `interview.py`.*

### Attack Scenario
The voice upload endpoint reads raw bytes and passes them directly to Groq Whisper without validating:
- No content-type validation (any file type accepted)
- No file size limit (only limited by body size middleware at 1MB)
- No audio format validation (magic bytes)
- File extension comes from user-controlled `audio.filename`

An attacker could upload a malicious file disguised as audio, consuming Groq API credits and potentially triggering server-side processing vulnerabilities.

### Fix
```python
# Add validation:
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mp4", "audio/ogg", "audio/x-m4a"}
MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10MB

if audio.content_type and audio.content_type not in ALLOWED_AUDIO_TYPES:
    raise HTTPException(400, "Only audio files (webm, wav, mp4, ogg) are allowed.")

audio_bytes = await audio.read()
if len(audio_bytes) > MAX_AUDIO_BYTES:
    raise HTTPException(413, "Audio file too large. Maximum 10MB.")
if len(audio_bytes) < 100:
    raise HTTPException(400, "Audio file is too small to be valid.")
```

---

## VULN-018 — 🟡 MEDIUM: No CSRF Token Rotation on Session Refresh

**Severity:** MEDIUM  
**Category:** CSRF / Session Fixation  
**File:** `backend/app/api/v1/endpoints/auth.py` (lines 208-232)

### Attack Scenario
The `/auth/refresh` endpoint rotates access and refresh tokens but does NOT rotate the CSRF token. A stolen CSRF token remains valid across session refreshes, widening the attack window.

### Fix
```python
@router.post("/refresh")
async def refresh_session(request: Request, response: Response):
    # ... existing refresh logic ...
    csrf_token = set_session_cookies_and_cleanup(response, sess.access_token, ...)
    return {"msg": "Session refreshed", "csrf_token": csrf_token}
```

---

## VULN-019 — 🔵 LOW: UUID Enumeration via Error Messages

**Severity:** LOW  
**Category:** Information Disclosure / API Enumeration  
**File:** Multiple endpoints

### Attack Scenario
Several endpoints return different error messages for "not found" vs "not authorized":
- Resume not found → `404 "Not found"`
- Resume exists but wrong user → `404 "Not found"` (correct — but only because of `.eq("user_id")`)

If the `user_id` filter is ever removed (regression), the response would distinguish between "exists" and "doesn't exist," enabling UUID enumeration.

### Fix
This is currently handled correctly. Maintain the pattern of always filtering by `user_id` so the response is identical regardless of whether the resource exists for another user.

---

## VULN-020 — 🔵 LOW: CORS Origin Matching is Exact String

**Severity:** LOW  
**Category:** CORS Misconfiguration  
**File:** `backend/app/main.py` (line 139)

### Attack Scenario
CORS origins are parsed from a comma-separated string. If an attacker registers a domain like `https://kareerist.com.evil.com`, it won't match (good). But if trailing slashes or port variations aren't handled, legitimate requests might fail while some edge cases pass.

### Fix
The current implementation is secure. Document the exact list of allowed origins and ensure they match production URLs exactly.

---

## VULN-021 — 🔵 LOW: ProxyHeadersMiddleware Trusts All Hosts

**Severity:** LOW  
**Category:** IP Spoofing  
**File:** `backend/app/main.py` (line 258)

### Attack Scenario
```python
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])
```
This trusts `X-Forwarded-For` from ANY source. An attacker can spoof their IP to bypass rate limiting.

### Fix
```python
# Restrict to known proxy IPs (Render/Cloudflare):
if _is_prod:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["10.0.0.0/8", "172.16.0.0/12"])
```
Since Cloudflare's `CF-Connecting-IP` is used first (rate_limit.py), this is partially mitigated.

---

## VULN-022 — 🔵 LOW: No `Logout` Server-Side Session Invalidation Guarantee

**Severity:** LOW  
**Category:** Session Management  
**File:** `backend/app/api/v1/endpoints/auth.py` (lines 234-244)

### Attack Scenario
The logout endpoint calls `supabase.auth.sign_out()` but catches and swallows any exception. If the Supabase call fails (network error), the JWT remains valid until expiration (4 days).

### Fix
This is acceptable for MVP. For production, consider:
- Shorter JWT expiration (1 hour instead of 4 days)
- JWT blocklist in Redis for explicitly revoked tokens
- Force re-auth for sensitive operations

---

## VULN-023 — 🔵 LOW: No Dependency Vulnerability Scanning

**Severity:** LOW  
**Category:** Supply Chain Security  
**File:** `backend/requirements.txt`

### Attack Scenario
Dependencies are pinned (good) but never audited for known CVEs. If `pypdf`, `reportlab`, or any other package has a known vulnerability, it won't be caught.

### Fix
```bash
# Add to CI pipeline:
pip install pip-audit
pip-audit -r requirements.txt

# Or use GitHub Dependabot / Snyk for automated alerts
```

### Current Assessment
All pinned versions appear current as of May 2026. Key packages to watch:
- `pypdf==6.5.0` — PDF parsing (RCE risk if vulnerable)
- `reportlab==4.4.9` — PDF generation
- `groq==1.0.0` — AI client
- `supabase==2.27.0` — Database client
- `PyJWT==2.10.1` — JWT handling
