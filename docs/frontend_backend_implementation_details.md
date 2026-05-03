# Frontend And Backend Implementation Details

## Chapter 1: Overview

This document explains what was implemented across the frontend and backend during the security and Google Auth update.

The project remains:

- Frontend: React + Vite + TypeScript
- Backend: FastAPI
- Auth/database: Supabase
- Session state: Redis for AI interviews
- AI providers: Groq and Hugging Face

The main goal was to strengthen the MVP foundation without changing the core product flow.

## Chapter 2: Backend Configuration

The backend config was expanded in `backend/app/core/config.py`.

New or important settings:

```env
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
CORS_ORIGINS=
COOKIE_SECURE=
COOKIE_SAMESITE=
AUTH_ACCESS_COOKIE_NAME=
AUTH_REFRESH_COOKIE_NAME=
RATE_LIMIT_AUTH=
RATE_LIMIT_UPLOAD=
RATE_LIMIT_ANALYSIS=
RATE_LIMIT_COVER_LETTER=
RATE_LIMIT_INTERVIEW=
RATE_LIMIT_ATS=
MAX_UPLOAD_BYTES=
REDIS_URL=
```

These settings allow rate limits, cookie behavior, CSRF origin checks, OAuth exchange, and upload limits to be managed through env values.

## Chapter 3: Backend Rate Limiting

Rate limiting uses SlowAPI.

Core files:

- `backend/app/core/rate_limit.py`
- `backend/app/main.py`

The app registers:

- `app.state.limiter`
- `RateLimitExceeded` exception handler

Rate limits were added to:

- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/resumes.py`
- `backend/app/api/v1/endpoints/ai_analysis.py`
- `backend/app/api/v1/endpoints/cover_letter.py`
- `backend/app/api/v1/endpoints/interview.py`
- `backend/app/api/v1/endpoints/ats_score.py`

The expensive feature endpoints use a rate key that tries to combine IP address and authenticated user ID.

## Chapter 4: Backend CSRF Protection

New file:

- `backend/app/core/csrf.py`

This adds a global FastAPI dependency in `backend/app/main.py`.

The CSRF check applies to unsafe HTTP methods:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

The dependency checks `Origin` first, then falls back to `Referer`. If the origin is not allowed by `CORS_ORIGINS`, the request is rejected with `403`.

This is important because the app uses cookies for auth.

## Chapter 5: Backend Cookie Auth

Cookie helpers live in:

- `backend/app/core/auth_cookies.py`

Auth endpoints live in:

- `backend/app/api/v1/endpoints/auth.py`

Login now sets:

- Access token cookie
- Refresh token cookie

Both are HttpOnly. Cookie names and lifetime are configurable.

The backend also has:

- `/api/v1/auth/refresh`
- `/api/v1/auth/logout`
- `/api/v1/auth/me`
- `/api/v1/auth/oauth/session`

## Chapter 6: Backend Google OAuth Exchange

React starts the Google OAuth flow, but FastAPI completes the session.

Backend endpoint:

```text
POST /api/v1/auth/oauth/session
```

Payload:

```json
{
  "code": "oauth_authorization_code",
  "code_verifier": "pkce_code_verifier"
}
```

The backend uses Supabase anon client to exchange the code for a Supabase session, then mirrors the resulting tokens into HttpOnly cookies.

This keeps the final application session controlled by the backend.

## Chapter 7: Backend Resume Upload Hardening

File:

- `backend/app/api/v1/endpoints/resumes.py`

Added protections:

- Rate limit through `RATE_LIMIT_UPLOAD`
- `Content-Length` check
- Post-read byte-size check
- PDF binary signature check using `%PDF-`
- Safe basename extraction for uploaded filenames

Current limit:

```env
MAX_UPLOAD_BYTES=5242880
```

## Chapter 8: Backend AI Prompt Hardening

Updated files:

- `backend/app/services/resume_analyzer.py`
- `backend/app/services/cover_letter_gen.py`
- `backend/app/services/ai_interview.py`

The prompts now include security instructions that tell the model:

- Resume text is untrusted
- Job description text is untrusted
- Candidate answers are untrusted
- Instructions inside user-provided content must be ignored
- Secrets, system prompts, environment variables, and internal implementation details must not be revealed

User content is separated with XML-style delimiters to make the boundary clearer.

## Chapter 9: Frontend Supabase Client

New file:

- `FRONTEND/src/lib/supabase.ts`

This creates a Supabase browser client only when these env variables exist:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The client uses:

```ts
flowType: "pkce"
detectSessionInUrl: false
persistSession: true
autoRefreshToken: false
```

PKCE is required so the browser can start OAuth securely and the backend can complete the session exchange.

## Chapter 10: Frontend API Client

Updated file:

- `FRONTEND/src/lib/api.ts`

Added:

```ts
apiExchangeOAuthSession(code, code_verifier)
```

This calls:

```text
/api/v1/auth/oauth/session
```

The existing API wrapper already sends cookies using:

```ts
credentials: "include"
```

That remains the correct behavior for HttpOnly-cookie auth.

## Chapter 11: Frontend Auth Hook

Updated file:

- `FRONTEND/src/hooks/useAuth.ts`

Added:

- `loginWithGoogle()`
- `completeOAuthLogin(code)`

`loginWithGoogle()` starts Supabase OAuth:

```ts
supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

`completeOAuthLogin()` reads the PKCE code verifier from localStorage and sends it to the backend with the authorization code.

After backend success, the hook updates the authenticated user state.

## Chapter 12: Frontend Auth Callback Page

New file:

- `FRONTEND/src/pages/AuthCallback.tsx`

New route:

```text
/auth/callback
```

The page:

- Reads `code` from the URL query string
- Handles OAuth errors from the URL
- Calls `completeOAuthLogin(code)`
- Redirects to `/dashboard` on success
- Redirects to `/` on failure

## Chapter 13: Frontend Auth Modal

Updated file:

- `FRONTEND/src/components/ui/AuthModal.tsx`

Added a Google sign-in button:

```text
Continue with Google
```

The modal still supports:

- Email/password login
- Email/password signup

Google sign-in is now an additional path.

## Chapter 14: Frontend Routing

Updated file:

- `FRONTEND/src/App.tsx`

Added route:

```tsx
<Route path="/auth/callback" element={<AuthCallback />} />
```

This is the local redirect target that must also be registered in Supabase Dashboard.

Also added the admin route:

```tsx
<Route path="/admin" element={<AdminPage />} />
```

The admin page is available at:

```text
http://localhost:8080/admin
```

## Chapter 15: Frontend Admin Page

New file:

```text
FRONTEND/src/pages/AdminPage.tsx
```

The admin page was added as an MVP operations console using the existing Kareerist UI style.

It includes these sections:

- Header and route context
- Auth-gated-only warning
- Security summary cards
- Implemented security controls
- Required env variable table
- Supabase Google Auth checklist
- Current rate-limit defaults

The page uses existing design patterns:

- `Navbar`
- Dark/card UI
- Lucide icons
- Tailwind utility classes
- Rounded `8px`-style cards
- Muted border and background treatment consistent with dashboard styling

Current access behavior:

- User must be logged in.
- Any logged-in user can currently access it.

Production recommendation:

Add a real admin role in the database, for example:

```sql
alter table public.profiles add column if not exists is_admin boolean not null default false;
```

or:

```sql
alter table public.profiles add column if not exists role text not null default 'user';
```

Then enforce admin access in both places:

- Frontend route guard
- Backend admin-only API dependencies

## Chapter 16: Frontend Navigation Update

Updated file:

```text
FRONTEND/src/components/layout/Navbar.tsx
```

Added Admin navigation for authenticated users:

- Desktop profile dropdown
- Mobile account menu

The Admin item uses a shield icon and routes to:

```text
/admin
```

This keeps the page discoverable during local MVP setup.

## Chapter 17: Environment Files

New examples:

- `backend/app/.env.example`
- `FRONTEND/.env.example`

For local development without a domain:

Backend:

```env
CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

Frontend:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

## Chapter 16: Supabase Dashboard Requirements

For Google Auth to work locally, configure Supabase:

Site URL:

```text
http://localhost:8080
```

Redirect URL:

```text
http://localhost:8080/auth/callback
```

Google provider must be enabled in Supabase Auth providers.

The profiles sync migration should also be applied so new Google users get inserted into `public.profiles`.

## Chapter 19: Validation Done

The following checks were run:

```bash
python3 -m compileall backend/app
```

Passed.

```bash
backend/.venv/bin/python3 -c "import sys; sys.path.insert(0, 'backend'); import app.main; print('ok')"
```

Passed after installing missing backend dependencies.

```bash
npm run build
```

Passed.

```bash
npm run lint
```

Passed with existing Fast Refresh warnings only. No lint errors.

After adding the admin page, these were run again:

```bash
npm run build
```

Passed.

```bash
npm run lint
```

Passed with existing Fast Refresh warnings only. No lint errors.

## Chapter 20: Known Remaining Notes

The app currently has no production domain, so local URLs are correct for now.

When a domain is available:

- Add production Site URL in Supabase
- Add production callback URL
- Update backend `CORS_ORIGINS`
- Set `COOKIE_SECURE=true`
- Use HTTPS only

The upload security is MVP-grade. For a later production phase, consider antivirus scanning, stricter PDF parsing limits, and storage abuse monitoring.

The admin page is useful for setup visibility, but it is not a true production admin console until role-based access is added.
