# September 2026 Updates Summary (v1.0.3, v1.0.4, v1.0.5, v1.0.6 & v1.0.7)

[← Back to Documentation Hub](../README.md) · [← History Index](./INDEX.md)

---

## Overview

In September 2026, Kareerist underwent five major upgrade cycles:
1. **v1.0.3 Bug Fix Release:** Implemented automated credit refunds on AI failure, fixed mobile background scroll bleed-through on auth modals, and added slow-loading status indicators.
2. **v1.0.4 Security Hardening & Repository Restructuring:** Completed comprehensive QA pentest audit remediations, expanded the automated test suite to 37 passing unit tests, and restructured the monorepo into a unified documentation hub under `docs/`.
3. **v1.0.5 Launch Readiness & Hardening:** Enforced reverse-proxy HTTPS, secret exposure build guards, GDPR cookie consent, per-route SEO, admin telemetry, and WCAG AA contrast.
4. **v1.0.6 Resume Diff, Signed URL Streaming & ATS PDF Compilation:** Added in-situ PDF Before vs. After diff visualizer, 1-hour signed URL preview streaming from Supabase Storage, ReportLab Platypus ATS PDF compiler with AI replacements, and expanded test suite to 71 automated tests.
5. **v1.0.7 Interactive Structured Resume Editor, Multi-Template ATS Engine & Upload Parsing:** Built interactive structured resume editor with live A4 preview, 4 ATS templates (Classic Overleaf/Jake's ATS standard, Modern Tech, Minimalist, Technical), Groq LLM resume parser with self-healing lazy backfill for uploaded resumes, John Doe mock data, and expanded test suite to 75 passing automated tests.

----

## 1. Bug Fixes & UX Enhancements (v1.0.3)

### A. Credit Refund on Deep Analysis & Hiring Intel Failure
- **Problem:** If Groq LLM timed out (>45s) or returned invalid JSON during Deep Analysis (15 credits) or Hiring Intel (25 credits), the backend raised HTTP 502, but credits were permanently deducted from the user's balance.
- **Fix:** In `ai_analysis.py`, added atomic `refund_feature_credits()` calls before raising HTTP 502. If an AI call returns `None`, credits are immediately restored to the user's balance, and a transaction is recorded with `feature = "ai_failure_refund"`.
- **Secondary Effect:** Eliminated false "Not enough credits" popups on subsequent retry attempts because the balance is properly restored before the frontend queries it.

### B. Mobile Sign-In Background Scroll Lock
- **Problem:** On iOS Safari and mobile Chrome, touching the AuthModal backdrop caused the background webpage behind the modal to scroll upward.
- **Fix:** In `AuthModal.tsx`, added a `useEffect` hook that sets `document.body.style.overflow = "hidden"` on mount and restores the original value on unmount, preventing touch-scroll bleed-through.

### C. Hiring Intel Slow-Loading UX Warning
- **Problem:** Hiring intelligence generation takes 30–60s on Render free-tier due to prompt complexity and cold starts, leading users to believe the app had frozen.
- **Fix:** In `ResumeAnalysis.tsx`, added a 45-second timer that displays an amber warning message beneath the button: *"⏳ Still working — Hiring Intel is thorough (30–60s). Hang tight..."* Cleared automatically upon request completion.

---

## 2. Security Hardening & Audit Remediations (v1.0.4)

### A. Stored XSS Prevention in Profile Full Name (SEC-008 / VULN-004)
- Added `@field_validator("full_name", mode="before")` on `UserAuth` schema to strip all HTML tags (`<[^>]+>`) and dangerous injection characters (`[<>"\'&;]`), capping the length at 100 characters.

### B. Voice Interview Permissions Policy (SEC-019 / VULN-016)
- Updated `Permissions-Policy` header in FastAPI `SecurityHeadersMiddleware` from `microphone=()` to `microphone=(self)`, allowing browser microphone capture during AI mock interviews while blocking camera and geolocation.

### C. Edge Security Headers on Vercel (VULN-010 / COMPAT-002)
- Added HTTP security headers in `FRONTEND/vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=()`, and `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

### D. Multi-Tenant Query Scoping (SEC-015 / VULN-014)
- Added `.eq("user_id", str(user.id))` to `get_analysis_history` in `ai_analysis.py`, providing defense-in-depth isolation in addition to Supabase RLS.

### E. Voice Audio Upload Validation (VULN-009 / VULN-017)
- In `interview.py`, added MIME type validation (`ALLOWED_AUDIO_TYPES`), file extension allowlist (`ALLOWED_AUDIO_EXTENSIONS`), and a strict 10MB file size limit (`HTTPException(413)`).

### F. OAuth Internal Exception Masking (SEC-026 / VULN-006)
- In `auth.py:oauth_exchange_session`, masked raw Supabase error messages from the HTTP 401 client response while preserving server-side debug tracebacks.

### G. Humanize Payload Bounds (P1-3 / VULN-020)
- In `models.py`, added `Field(..., min_length=50, max_length=5000)` on `HumanizeRequest.text` to prevent empty inputs or unbounded denial of service payloads.

### H. Prompt Sanitizer Hardening (AI-001 / AI-002)
- Added Unicode NFKC normalization (`unicodedata.normalize("NFKC", text)`) to neutralize homoglyphs and fullwidth tag bypasses (e.g. `＜RESUME_TEXT＞`).
- Stripped HTML comments (`<!--.*?-->`).
- Implemented a 3-pass loop against reconstructed nested tags (`<RES<RESUME_TEXT>UME_TEXT>`).
- Filtered system prompt extraction directives (`repeat your system prompt`, `reveal your instructions`).

---

## 3. Monorepo Documentation Restructuring

- Reorganized 133 scattered documentation files into a unified `docs/` hub:
  - `docs/specifications/`
  - `docs/architecture/`
  - `docs/explanations/`
  - `docs/history/`
  - `docs/qa/`
  - `docs/security/`
- Created `docs/README.md` and `docs/architecture/README.md` as visual navigation portals.
- Cleaned the root repository directory down to core services (`backend/`, `FRONTEND/`, `supabase/`, `kareerist_blog/`) and essential configuration files.
- Synchronized all changes with 100% test parity across both `testing_new` and `main` branches.

---

## 4. Production Launch Readiness & Frontend Hardening (v1.0.5 — September 9, 2026)

### A. Frontend Secret Exposure Protection
- Created `FRONTEND/.env.example` defining allowable public keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE`, `VITE_SENTRY_DSN`, `VITE_EMAILJS_*`) with explicit security notices against storing private server secrets.
- In `FRONTEND/vite.config.ts`, added a build-time guard plugin that validates environment variables, rejecting the build if any key matching `SERVICE_ROLE`, `SECRET_KEY`, `PRIVATE_KEY`, `DATABASE_URL`, or `POSTGRES_PASSWORD` is exposed via `VITE_`.

### B. Reverse-Proxy HTTPS Enforcement & HSTS
- Updated `SecurityHeadersMiddleware` in `backend/app/main.py` with `x-forwarded-proto` reverse-proxy awareness (e.g. Vercel, Fly.io, AWS ALB).
- Production requests arriving over unencrypted HTTP are permanently redirected (301) to HTTPS.
- Injected `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header on all secure requests.

### C. GDPR/CCPA Cookie Consent Manager
- Built `FRONTEND/src/components/ui/CookieConsent.tsx` with glassmorphic dark theme, providing options for "Accept All", "Essential Only", and customizable privacy settings.
- Consent preferences persist across sessions via `localStorage`.
- Added a "Cookie Preferences" link in `Footer.tsx` that triggers the consent dialog at any time.

### D. Route-Aware SEO & Structured Data
- Created `FRONTEND/src/components/SEO.tsx` featuring `RouteSEOManager` to dynamically update document titles, meta descriptions, canonical URLs, and Open Graph tags across every client route.
- Injected Schema.org `SoftwareApplication` JSON-LD structured data into `FRONTEND/index.html`.

### E. Social Preview Assets
- Generated branded 1200×630px cards: `FRONTEND/public/og-image.png` (99KB), `FRONTEND/public/og-image.webp` (44KB), and `FRONTEND/public/twitter-card.png`.
- Configured Open Graph and Twitter summary card tags.

### F. Sitemap & Search Bot Protection
- Added XML sitemap at `FRONTEND/public/sitemap.xml` listing all canonical public routes with priority weights.
- Updated `FRONTEND/public/robots.txt` to disallow private and admin paths (`/admin`, `/dashboard`, `/credits`, `/interview/history`, `/auth/callback`, `/api/`).

### G. Image Compression & Performance
- Losslessly compressed all static public images (Pillow zlib level 9) and generated WebP variants.
- Enforced `loading="lazy"` and `decoding="async"` across images in `Contact.tsx`.

### H. WCAG 2.1 AA Color Contrast Compliance
- Bumped dark mode `--muted-foreground` to `40 6% 65%` in `index.css` (achieving 6.5:1 contrast against dark canvas).
- Replaced low-contrast opacity classes (`text-muted-foreground/30`, `/40`, `/50`) across `Navbar.tsx`, `Features.tsx`, `Dashboard.tsx`, `CreditDisplay.tsx`, and `AuthModal.tsx`.

### I. Form Validation & Spam Defense
- **Contact Form (`Contact.tsx`):** Real-time field validation (Name 2-80, valid Email regex, Message 10-2000 chars), live character counter, hidden honeypot field, submission velocity check (< 1.5s), client-side hourly submission cap (max 3/hr), and HTML tag stripping.
- **Auth Modal (`AuthModal.tsx`):** Email format validation, password minimum length check (≥ 6), hidden honeypot trap, and a 30-second cooldown penalty after 5 consecutive failed login attempts.

### J. Admin Telemetry & Analytics Dashboard
- Created `FRONTEND/src/components/admin/AdminAnalyticsView.tsx` and mounted a new **Analytics** tab in `AdminPage.tsx`.
- Displays conversion funnels (Signups → Resumes → Analyses → Interviews → Letters), feature distribution bars, DAU/WAU/MAU cohorts, credit economy burn rates, and one-click JSON telemetry export.

### K. Unified Primary Call to Action
- Standardized the Navbar, Hero, and FinalCTA around **"Start Free Analysis"** with supporting trust microcopy (*"100 Free Credits on Signup • No Credit Card Required"*).

---

## 5. In-Situ Resume Diff, Signed URL Streaming & ATS PDF Compilation (v1.0.6 — September 13, 2026)

### A. In-Situ Resume Diff Visualizer (`ResumeDiffView`)
- **Problem:** After running Deep Analysis, candidates had to read textual critiques in the right accordion panel and manually cross-reference them with their resume, making it difficult to visualize the impact of recommended bullet improvements.
- **Solution:** Implemented `ResumeDiffView` embedded directly into the central canvas of `ResumeAnalysis.tsx`:
  - Renders side-by-side or inline Before vs. After comparisons of weak bullet points and their AI-improved counterparts.
  - Linked to a dedicated "Open Diff View" action button in `DeepAnalysisPanel.tsx`.
  - Includes dismiss and view toggle controls (`preview`, `diff`, `edit`).

### B. Supabase Storage Signed URL Streaming
- **Problem:** In previous iterations, selecting a saved resume from the sidebar either rendered raw extracted text or attempted to load local object URLs that failed across browser sessions.
- **Solution:** In `backend/app/api/v1/endpoints/resumes.py`, updated `get_resume` to dynamically request a 1-hour valid signed URL from Supabase Storage (`supabase.storage.from_("Resumes").create_signed_url(file_path, 3600)`).
- **Result:** The canvas renders an embedded `iframe` pointing to `pdf_url` with zero CORS hurdles or JWT header requirements, giving candidates pixel-perfect previews of their uploaded PDF documents with a dedicated "Download PDF" action.

### C. ATS Optimized Resume PDF Generator (`resume_pdf_generator.py`)
- **Architecture:** Built an in-house document generation pipeline using ReportLab Platypus (`backend/app/services/resume_pdf_generator.py`):
  - `parse_issue_string(text)`: Parses structured critique strings (`Original bullet → Critique → Fix: ...`).
  - `apply_replacements(text, replacements)`: Surgically swaps weak bullet points in the resume with their AI fixes while handling whitespace normalization, regex variations, and bullet prefixes.
  - `generate_resume_pdf(resume_text, replacements)`: Formats the document with standardized ATS fonts (Helvetica), structured section headers (Experience, Education, Skills, Projects), divider rules, and clean margins.
- **API Endpoints:** Added `POST /api/v1/resumes/{resume_id}/optimized_pdf` and `GET /api/v1/resumes/{resume_id}/optimized_pdf` to dynamically generate and download the optimized PDF resume.

### D. Analysis Workspace UI & Ergonomics
- **Canvas Preservation:** Added collapsible / minimize controls for the analysis panel, preventing canvas squishing on standard laptop viewports.
- **Workspace Focus:** Cleaned up manual text edit controls from the default canvas view to maintain an uncluttered IDE workflow focused on PDF inspection and deep analysis results.

### E. Test Suite Expansion to 71 Automated Tests
- Added `backend/tests/test_resume_pdf_generator.py` (5 tests) verifying issue string parsing, text replacement logic, section header heuristics, and the PDF generation endpoint.
- Added comprehensive recovery and rate-limiting tests in `backend/tests/test_deep_analysis.py` (29 tests) verifying dynamic delay parsing from 429 errors, malformed JSON recovery, and atomic credit refund guarantees.
- Combined with `test_critical_paths.py` (37 tests), the entire backend test suite now verifies **71 tests passing (100% pass rate)**.

---

## 6. Interactive Structured Resume Editor, Multi-Template ATS Generation & Upload Parsing (v1.0.7 — September 13, 2026)

### A. Interactive Structured Resume Editor (`/resumes/{id}/editor`)
- **Problem:** Candidates frequently needed to adjust their resume structure, fix grammar, or incorporate AI improvements directly within Kareerist without leaving the platform to re-edit LaTeX/Word documents and re-upload.
- **Solution:** Built a dedicated, full-screen Structured Resume Editor in `FRONTEND/src/pages/ResumeEditor.tsx`:
  - **Two-Column Responsive Layout:** Granular form section editors on the left, live reactive A4 page preview sheet on the right (`ResumePreviewSheet.tsx`).
  - **Section Navigation:** Supports Personal Basics, Professional Summary, Work Experience, Education, Technical Skills, Projects, and Certifications.
  - **Dynamic Item Management:** Allows adding/removing jobs, schools, projects, certifications, custom bullet points, and categorized technical skill groups.
  - **Auto-Save Engine & Dirty State:** Automatically saves draft modifications with a subtle status badge (`Unsaved changes`, `Saving...`, `Saved`) alongside a manual "Save Changes" trigger.
  - **Quick AI Fix Ingestion:** Directly incorporates AI bullet optimizations from deep analysis without manual copy-pasting.

### B. Multi-Template ATS Architecture & Classic ATS Fidelity
- **Multi-Template System:** Implemented 4 distinct template styles across both the React HTML preview and the ReportLab Platypus PDF generator:
  1. **Classic ATS (Jake's / Overleaf ATS Standard):** Centered header with clickable links and middle dots (`•`), elegant Times-Roman serif typography, small-caps/title-cased section headings with full-width black horizontal rules, single-line experience/education layouts (`[Role, Company] ----- [Location, Date]`), markdown bold (`**keyword**`) inline rendering, and middle-dot-separated technical skill categories.
  2. **Modern Tech:** Sleek sans-serif layout with primary brand accents, pill badges for skills, and modern card styling.
  3. **Minimalist:** Clean monochrome typography with subtle border dividers and generous whitespace.
  4. **Technical:** High-density, engineering-oriented format with monospace tags and dense skill grouping.
- **High-Fidelity PDF Generation:** Aligned `backend/app/services/resume_pdf_generator.py` with the React preview:
  - Exact margin calibration (36pt / 0.5 in).
  - Title-cased headings (`EDUCATION`, `EXPERIENCE`, `PROJECTS`, `TECHNICAL SKILLS`) with full-width black line dividers (`HRFlowable`).
  - Single-line two-column flex tables with zero padding for role/company and date/location headers.
  - Middle-dot bullets (`&bull;`) and category delimiters (`&bull;` or `•`).
  - Markdown bold syntax parsing (`**keyword**` converted to `<b>keyword</b>` in Platypus `Paragraph` flowables).

### C. Groq LLM Resume Parser & Self-Healing Backfills
- **High-Speed Parser Service:** Created `backend/app/services/resume_parser.py` using Groq's high-throughput LLMs (`openai/gpt-oss-20b` primary with automatic fallback to `openai/gpt-oss-120b`).
- **Structured Schema & Strict Coercion:** Defined Pydantic models (`ResumeData`, `Basics`, `ExperienceItem`, `EducationItem`, `SkillCategory`, `ProjectItem`, `CertificationItem`) with `model_validator(mode="before")` and recursive null coercion to guarantee no `null` strings or empty arrays ever break the frontend or backend renderers.
- **Self-Healing Upload Backfills:** When existing uploaded resumes with missing or unpopulated `structured_content` are opened in the editor (`GET /api/v1/resumes/{resume_id}/editor_data`), the backend lazily triggers LLM extraction on the raw stored text, populates the schema, and automatically persists it to Supabase `resumes.structured_content` in the background.

### D. Form Ergonomics & John Doe Starter Mock Data
- **Zero Blank Slate:** Newly created resumes are pre-populated with realistic, comprehensive "John Doe" software engineer mock data so users can immediately see the formatting and customize from a proven template.
- **Accessible Form Dropdowns:** Upgraded low-contrast dropdowns and form selects across the editor with high-contrast styling (`bg-slate-900`, `border-slate-700`, and `text-white`).
- **Unified Navigation:** Added "Edit in Resume Editor" and "Create New Resume" action buttons directly on the Resume Analysis page and sidebar cards, ensuring a seamless round-trip between analysis and editing.

### E. Test Suite Expansion to 75 Automated Tests
- Added `backend/tests/test_resume_parser.py` (parsing heuristics, fallback handling, null safety).
- Added `backend/tests/test_resume_editor_endpoints.py` (editor data retrieval, update endpoints, persistence).
- Added `backend/tests/test_structured_pdf_generator.py` (multi-template PDF generation, ReportLab compilation, formatting verification).
- The automated test suite now verifies **75 tests passing with 100% pass rate**.



