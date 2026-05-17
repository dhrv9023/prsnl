# CSRF Testing Guide — May 2026 Security Fix

**Date:** May 17, 2026  
**Issue:** Cookie vulnerabilities (Bearer prefix + SameSite=None without CSRF protection)  
**Fix:** Raw JWT in cookie + CSRF double-submit pattern  
**Status:** ✅ Fixed on `testing` branch

---

## What Was Fixed

### Issue 1: Bearer Prefix in Cookie Value
**Before:** Cookie stored `"Bearer eyJ..."`  
**After:** Cookie stores raw JWT `"eyJ..."`

### Issue 2: SameSite=None Without CSRF Protection
**Before:** `SameSite=None` with no CSRF validation = vulnerable to CSRF attacks  
**After:** `SameSite=None` + CSRF double-submit pattern = protected

---

## How CSRF Protection Works

### The Pattern

1. **On Login:**
   - Backend sets 3 cookies:
     - `access_token` (HttpOnly, raw JWT)
     - `refresh_token` (HttpOnly)
     - `csrf_token` (NOT HttpOnly, random 64-char hex)

2. **On Every Mutating Request (POST/PUT/DELETE):**
   - Frontend reads `csrf_token` from `document.cookie`
   - Frontend sends it as `X-CSRF-Token` header
   - Backend validates: header value must match cookie value

3. **Why It Works:**
   - Attacker's cross-site page CAN trigger requests with your cookies (SameSite=None)
   - Attacker's cross-site page CANNOT read your `csrf_token` cookie (same-origin policy)
   - Without the token, the request is rejected (403 Forbidden)

---

## Testing Locally

### Step 1: Start Services in Development Mode (Default)

```bash
./run.sh
```

**What happens:**
- `ENVIRONMENT=development` (default in `.env`)
- `COOKIE_SAMESITE=lax` (default in config)
- CSRF middleware is **disabled** (only enforced in production)
- You can test normally without worrying about CSRF tokens

**Output:**
```
CSRF Testing:
  Current mode: disabled (development mode)
```

### Step 2: Test CSRF Protection in Production Mode

To test the CSRF protection locally, enable production mode:

#### 2a. Edit `backend/app/.env`

```bash
nano backend/app/.env
```

Change these lines:

```env
ENVIRONMENT="production"
COOKIE_SECURE=true
COOKIE_SAMESITE="none"
```

#### 2b. Restart Services

```bash
# Stop the current run.sh (Ctrl+C)
# Then start again
./run.sh
```

**What happens:**
- `ENVIRONMENT=production`
- `COOKIE_SAMESITE=none`
- CSRF middleware is **enabled**
- Every POST/PUT/DELETE request must include `X-CSRF-Token` header

**Output:**
```
CSRF Testing:
  Current mode: enabled (production mode)
```

#### 2c. Test the CSRF Protection

**Test 1: Normal login should work**

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}' \
  -c cookies.txt
```

**Expected response:**
```json
{
  "msg": "Login successful",
  "csrf_token": "a1b2c3d4e5f6...",
  "user": {"id": "...", "email": "test@example.com"}
}
```

**Test 2: POST without CSRF token should fail**

```bash
curl -X POST http://localhost:8000/api/v1/resumes/upload \
  -b cookies.txt \
  -F "file=@resume.pdf"
```

**Expected response (403 Forbidden):**
```json
{"detail":"CSRF token missing. Refresh the page and try again."}
```

**Test 3: POST with correct CSRF token should work**

```bash
# Extract the csrf_token from the login response
CSRF_TOKEN="a1b2c3d4e5f6..."

curl -X POST http://localhost:8000/api/v1/resumes/upload \
  -b cookies.txt \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -F "file=@resume.pdf"
```

**Expected response (200 OK):**
```json
{"msg":"Resume uploaded successfully","id":"...","extracted_length":1234}
```

**Test 4: POST with wrong CSRF token should fail**

```bash
curl -X POST http://localhost:8000/api/v1/resumes/upload \
  -b cookies.txt \
  -H "X-CSRF-Token: wrong_token_value" \
  -F "file=@resume.pdf"
```

**Expected response (403 Forbidden):**
```json
{"detail":"CSRF token mismatch. Refresh the page and try again."}
```

---

## Frontend Testing

### In Development Mode (Default)

The frontend automatically reads the CSRF token from the cookie and sends it on every request. No changes needed.

**How it works:**
1. User logs in
2. Backend sets `csrf_token` cookie
3. Frontend reads it: `document.cookie.split("; ").find(row => row.startsWith("csrf_token="))`
4. Frontend sends it on every POST/PUT/DELETE: `headers: { "X-CSRF-Token": token }`

### In Production Mode (Testing)

Same as development — the frontend code is identical. The only difference is the backend now enforces the validation.

**To verify the frontend is sending the token:**

1. Open DevTools (F12)
2. Go to Network tab
3. Make a request (e.g., upload a resume)
4. Click on the request
5. Go to Headers tab
6. Look for `X-CSRF-Token` header — it should be present

---

## Cookies in DevTools

### In Development Mode

**Application → Cookies → http://localhost:8000**

| Name | Value | HttpOnly | Secure | SameSite |
|---|---|---|---|---|
| `access_token` | `eyJ...` (raw JWT) | ✅ | ❌ | Lax |
| `refresh_token` | `...` | ✅ | ❌ | Lax |
| `csrf_token` | `a1b2c3d4...` | ❌ | ❌ | Lax |

### In Production Mode (Testing)

| Name | Value | HttpOnly | Secure | SameSite |
|---|---|---|---|---|
| `access_token` | `eyJ...` (raw JWT) | ✅ | ✅ | None |
| `refresh_token` | `...` | ✅ | ✅ | None |
| `csrf_token` | `a1b2c3d4...` | ❌ | ✅ | None |

**Key differences:**
- `Secure` flag is ON (requires HTTPS)
- `SameSite` is `None` (allows cross-site cookies)
- `csrf_token` is NOT HttpOnly (JavaScript can read it)

---

## Troubleshooting

### Q: I'm getting "CSRF token missing" errors

**A:** The frontend is not sending the `X-CSRF-Token` header. Check:
1. Is the `csrf_token` cookie set? (DevTools → Application → Cookies)
2. Is the frontend reading it? (DevTools → Network → check request headers)
3. Is the request a POST/PUT/DELETE? (GET requests don't need CSRF token)

### Q: I'm getting "CSRF token mismatch" errors

**A:** The token in the header doesn't match the cookie. Check:
1. Did you copy the token correctly?
2. Is the cookie still valid? (Tokens expire after 1 hour)
3. Did you log in again? (New login = new token)

### Q: CSRF middleware is not enforcing in production mode

**A:** Check:
1. Is `ENVIRONMENT=production` in `backend/app/.env`?
2. Did you restart the backend? (Changes to `.env` require restart)
3. Check `backend.log` for errors

### Q: I want to disable CSRF testing

**A:** Switch back to development mode:

```bash
# Edit backend/app/.env
ENVIRONMENT="development"
COOKIE_SAMESITE="lax"

# Restart the backend
./run.sh
```

---

## What to Test

### ✅ Test These Scenarios

1. **Login flow**
   - User logs in
   - `csrf_token` cookie is set
   - Response includes `csrf_token` in JSON

2. **Resume upload**
   - Upload a resume
   - Check that `X-CSRF-Token` header is sent
   - Verify upload succeeds

3. **Analysis requests**
   - Request ATS score
   - Request deep analysis
   - Request hiring intelligence
   - All should include `X-CSRF-Token` header

4. **Interview flow**
   - Start interview
   - Submit answers
   - End interview
   - All should include `X-CSRF-Token` header

5. **Cover letter generation**
   - Generate cover letter
   - Humanize cover letter
   - All should include `X-CSRF-Token` header

6. **Admin operations**
   - Grant credits
   - Set unlimited
   - All should include `X-CSRF-Token` header

### ✅ Test Edge Cases

1. **Expired CSRF token**
   - Wait 1 hour (or manually expire the cookie)
   - Try to make a request
   - Should fail with "CSRF token missing"

2. **Tampered CSRF token**
   - Manually change the `X-CSRF-Token` header value
   - Try to make a request
   - Should fail with "CSRF token mismatch"

3. **Missing CSRF token**
   - Manually remove the `X-CSRF-Token` header
   - Try to make a request
   - Should fail with "CSRF token missing"

4. **GET requests**
   - GET requests should NOT require CSRF token
   - Test: `GET /api/v1/auth/me`
   - Should work without `X-CSRF-Token` header

---

## Deployment

### To Production (Render)

The CSRF protection is **automatically enabled** in production because:
1. Render sets `ENVIRONMENT=production`
2. Render sets `COOKIE_SECURE=true` (HTTPS)
3. The backend automatically sets `COOKIE_SAMESITE=none` for cross-site cookies

**No additional configuration needed.**

### To Staging

Same as production — just deploy the `testing` branch to a staging environment.

---

## Summary

| Aspect | Development | Production |
|---|---|---|
| CSRF Middleware | Disabled | Enabled |
| SameSite | Lax | None |
| Secure Flag | Off | On |
| CSRF Token Required | No | Yes |
| Testing | Normal flow | Must send X-CSRF-Token |

---

## Next Steps

1. ✅ Test locally in development mode (default)
2. ✅ Test locally in production mode (follow steps above)
3. ✅ Verify all features work with CSRF protection
4. ✅ Merge `testing` branch to `main`
5. ✅ Deploy to production
6. ✅ Monitor for CSRF-related errors in Sentry

---

**Questions?** Check `TESTING_WORKFLOW.md` or `BRANCH_SETUP_SUMMARY.md` for more details.
