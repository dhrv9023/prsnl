# Kareerist — Project Documentation Index

This folder documents everything about the Kareerist project — what it is, how it's built, every decision made, every bug fixed, and the current state of the codebase.

---

## Chapters

| # | File | What it covers |
|---|------|----------------|
| 01 | [Project Genesis & Stack](./chapter_01_project_genesis_and_stack.md) | What Kareerist is, why it was built, the full tech stack |
| 02 | [Backend Architecture](./chapter_02_backend_architecture.md) | FastAPI structure, middleware stack, config, request flow |
| 03 | [Auth & Security](./chapter_03_auth_and_security.md) | HttpOnly cookies, CSRF, PKCE OAuth, rate limiting, all security layers |
| 04 | [AI Features & Services](./chapter_04_ai_features_and_services.md) | Every AI feature — how it works, what LLM is used, prompt design |
| 05 | [Credit System](./chapter_05_credit_system.md) | How credits work end-to-end — DB, RPC, deduction, daily grants, anti-farming |
| 06 | [Frontend Architecture](./chapter_06_frontend_architecture.md) | React structure, routing, auth context, credit context, API client |
| 07 | [Database & Migrations](./chapter_07_database_and_migrations.md) | All tables, RLS policies, functions, migration history |
| 08 | [Infrastructure & Deployment](./chapter_08_infrastructure_and_deployment.md) | Render, Vercel, Upstash, Supabase, Sentry, env vars |
| 09 | [Security Audit & All Fixes](./chapter_09_security_audit_and_fixes.md) | Every bug and vulnerability found and fixed — full audit trail |
| 10 | [Current State & What's Next](./chapter_10_current_state_and_roadmap.md) | What's live, what's working, what's post-MVP |
| 11 | [Voice Interview & TTS](./chapter_11_voice_interview_and_tts.md) ⭐ **NEW** | Voice input with Whisper STT, text-to-speech, interview timer |
| 12 | [Blog System](./chapter_12_blog_system.md) ⭐ **NEW** | Standalone blog, admin panel, content strategy, integration |

---

## Recent Updates

### **[September 2026 Updates Summary (v1.0.3, v1.0.4 & v1.0.5)](./UPDATES_SEP_2026.md)** ⭐ **LATEST**
Comprehensive summary of all changes made in September 2026:
- Production Launch Readiness (v1.0.5):
  - Frontend private secret exposure protection (Vite build-time guard)
  - Reverse-proxy HTTPS enforcement (`x-forwarded-proto`) and HSTS preload headers
  - GDPR/CCPA cookie consent manager with preferences drawer in footer
  - Dynamic per-route SEO (`RouteSEOManager`) and Schema.org JSON-LD structured data
  - Branded 1200×630 OpenGraph & Twitter preview images (`og-image.png`, `og-image.webp`)
  - XML Sitemap and robots.txt bot indexing protections
  - Image compression (Pillow zlib level 9) and responsive loading
  - WCAG 2.1 AA color contrast compliance (`--muted-foreground` to 65% lightness)
  - Form validation & anti-bot protection (honeypots, velocity checks, auth brute-force lockout)
  - Admin Analytics dashboard tab (conversion funnels, cohorts, credit burn, JSON telemetry)
  - Unified primary Call to Action ("Start Free Analysis" with 100 free credits badge)
- Security Audit Remediations (v1.0.4):
  - Stored XSS sanitization on user profile full name
  - Voice interview audio MIME type validation and 10MB payload size limit
  - Permissions-Policy header update unblocking voice interview microphone
  - Production edge security headers via Vercel configuration
  - Prompt sanitizer hardening (NFKC normalization, comment stripping, 3-pass loop)
- Core Reliability & Refund Enhancements (v1.0.3):
  - Credit refund fallback on AI failure (eliminated lost credits on Groq timeouts)
  - Mobile sign-in background scroll lock in AuthModal
  - Hiring Intel 45s slow-load UX status warning
  - Monorepo documentation consolidation under `docs/` hub (42 unit tests passing)

### **[May 2026 Updates Summary](./UPDATES_MAY_2026.md)**
Comprehensive summary of changes made in May 2026:
- Voice interview with Whisper STT
- Text-to-speech for questions
- Interview timer with auto-submit
- Standalone blog system
- Contact page with blog preview
- CSRF protection for cross-origin setup
- Critical bug fixes and database migrations

---

## Deep-Dive Code Explanations

In addition to the high-level architectural chapters, the codebase includes comprehensive, line-by-line file manuals under [`docs/explanations/`](../explanations/) for granular developer onboarding:

### Backend Explanations (`docs/explanations/backend/`)
- **[main.py](../explanations/backend/main.md)** — FastAPI entry point, CORS, and double-submit CSRF middleware stack.
- **[llm_client.py](../explanations/backend/llm_client.md)** — Groq Async client initialization, `llama-3.3-70b-versatile` details, and code-fence sanitizers.
- **[resume_analyzer.py](../explanations/backend/resume_analyzer.md)** — Legacy analyzer stub and LLM output parsing helpers.

### Frontend Explanations (`docs/explanations/frontend/`)
- **[Contact Page](../explanations/frontend/Contact.md)** — Form state, simulated submission timer, dynamic Supabase blog fetching, and accordion FAQ.
- **[Pricing Module](../explanations/frontend/Pricing.md)** — Dynamic pricing tier plans, staggered scroll entrance animations, and beta overlays.
- **[NotFound Fallback](../explanations/frontend/NotFound.md)** — Wildcard React routing catch-all page.
- **[use-toast Hook](../explanations/frontend/use-toast.md)** — Shadcn UI notification emitter and listener queue broadcaster.
- **Landing Sections:** **[Hero banner](../explanations/frontend/Hero.md)** | **[Dashboard preview](../explanations/frontend/Dashboard.md)** | **[Features grid](../explanations/frontend/Features.md)** | **[Value Narrative](../explanations/frontend/ValueNarrative.md)** | **[Final CTA](../explanations/frontend/FinalCTA.md)** | **[Feature Marquee](../explanations/frontend/FeatureMarquee.md)**.

### Database Migration Explanations (`docs/explanations/database/`)
- **[Profiles Auth Sync](../explanations/database/20260202140000_profiles_auth_sync.md)** — Triggers and sync handlers linking `auth.users` to `public.profiles`.
- **[Interview Reports persistence](../explanations/database/20260515000002_interview_reports.md)** — DB schema and user-view RLS.
- **[Daily Credit Grants](../explanations/database/20260517000001_daily_credits.md)** — UTC unique date constraint logs.
- **[Daily Grant Total Fix](../explanations/database/20260522000001_fix_daily_grant_total.md)** — Secure `grant_credits` RPC overrides and permissions revocations.
- **[Admin Credit Stats RPC](../explanations/database/20260522000003_admin_credit_stats_rpc.md)** — Optimized global JSONB aggregation query.
- **[Comprehensive Hotfix](../explanations/database/20260523000000_comprehensive_fix.md)** — RLS insertion policies and profile gaps backfill.
- **[Add Sign-In Tracker](../explanations/database/20260524000001_add_last_sign_in_at.md)** — timezone-aware login timestamp log.
- **[Add Resume-to-Interview Link](../explanations/database/20260524000002_add_resume_id_to_interview_reports.md)** — Foreign key history filter.

### Standalone Blog Explanations (`docs/explanations/blog/`)
- **[Architectural Overview](../explanations/blog/overview.md)** — Modular design and cross-origin integration details.
- **[App Viewport](../explanations/blog/App.md)** — Custom markdown parser grid, featured layout, and hidden dashboard hotkey.
- **[Admin Dashboard](../explanations/blog/Admin.md)** — Session auth, cover image Unsplash generator, and CRUD editors.
- **[Supabase API client](../explanations/blog/supabase.md)** — Connection details and typed interfaces.
- **[Database installer](../explanations/blog/supabase_migration.md)** — SQL schemas, RLS write policies, and 5 seed career articles.

---

## Quick Reference

- **Backend entry point:** `backend/app/main.py`
- **Frontend entry point:** `FRONTEND/src/App.tsx`
- **All migrations:** `supabase/migrations/`
- **Local dev:** `bash run.sh` from project root
- **Deploy backend:** Render (auto-deploy from `main` branch)
- **Deploy frontend:** Vercel (auto-deploy from `main` branch)
- **Blog:** Separate repo at `github.com/dhrv9023/kareerisit_blog`

---

*Last Updated: September 6, 2026*

