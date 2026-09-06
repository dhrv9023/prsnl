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

### **[May 2026 Updates Summary](./UPDATES_MAY_2026.md)** ⭐ **NEW**
Comprehensive summary of all changes made between May 22-24, 2026:
- Voice interview with Whisper STT
- Text-to-speech for questions
- Interview timer with auto-submit
- Standalone blog system
- Contact page with blog preview
- CSRF protection for cross-origin setup
- Critical bug fixes (CSRF, experience level, credit display, theme toggle)
- Database migrations and permissions fixes

---

---

## Deep-Dive Code Explanations

In addition to the high-level architectural chapters, the codebase includes comprehensive, line-by-line file manuals under `code_explanation/` for granular developer onboarding:

### Backend Explanations (`code_explanation/backend/`)
- **[main.py](../code_explanation/backend/main.md)** — FastAPI entry point, CORS, and double-submit CSRF middleware stack.
- **[llm_client.py](../code_explanation/backend/llm_client.md)** — Groq Async client initialization, `llama-3.3-70b-versatile` details, and code-fence sanitizers.
- **[resume_analyzer.py](../code_explanation/backend/resume_analyzer.md)** — Legacy analyzer stub and LLM output parsing helpers.

### Frontend Explanations (`code_explanation/frontend/`)
- **[Contact Page](../code_explanation/frontend/Contact.md)** — Form state, simulated submission timer, dynamic Supabase blog fetching, and accordion FAQ.
- **[Pricing Module](../code_explanation/frontend/Pricing.md)** — Dynamic pricing tier plans, staggered scroll entrance animations, and beta overlays.
- **[NotFound Fallback](../code_explanation/frontend/NotFound.md)** — Wildcard React routing catch-all page.
- **[use-toast Hook](../code_explanation/frontend/use-toast.md)** — Shadcn UI notification emitter and listener queue broadcaster.
- **Landing Sections:** **[Hero banner](../code_explanation/frontend/Hero.md)** (animated paths) | **[Dashboard preview](../code_explanation/frontend/Dashboard.md)** (telemetry animation meters) | **[Features grid](../code_explanation/frontend/Features.md)** (pillars matrix) | **[Value Narrative](../code_explanation/frontend/ValueNarrative.md)** (core philosophy) | **[Final CTA](../code_explanation/frontend/FinalCTA.md)** (auth redirection) | **[Feature Marquee](../code_explanation/frontend/FeatureMarquee.md)** (CSS infinite slide).

### Database Migration Explanations (`code_explanation/database/`)
- **[Profiles Auth Sync](../code_explanation/database/20260202140000_profiles_auth_sync.md)** — Triggers and sync handlers linking `auth.users` to `public.profiles`.
- **[Interview Reports persistence](../code_explanation/database/20260515000002_interview_reports.md)** — DB schema and user-view RLS.
- **[Daily Credit Grants](../code_explanation/database/20260517000001_daily_credits.md)** — UTC unique date constraint logs.
- **[Daily Grant Total Fix](../code_explanation/database/20260522000001_fix_daily_grant_total.md)** — Secure `grant_credits` RPC overrides and permissions revocations.
- **[Admin Credit Stats RPC](../code_explanation/database/20260522000003_admin_credit_stats_rpc.md)** — Optimized global JSONB aggregation query.
- **[Comprehensive Hotfix](../code_explanation/database/20260523000000_comprehensive_fix.md)** — RLS insertion policies and profile gaps backfill.
- **[Add Sign-In Tracker](../code_explanation/database/20260524000001_add_last_sign_in_at.md)** — timezone-aware login timestamp log.
- **[Add Resume-to-Interview Link](../code_explanation/database/20260524000002_add_resume_id_to_interview_reports.md)** — Foreign key history filter.

### Standalone Blog Explanations (`code_explanation/blog/`)
- **[Architectural Overview](../code_explanation/blog/overview.md)** — Modular design and cross-origin integration details.
- **[App Viewport](../code_explanation/blog/App.md)** — Custom markdown parser grid, featured layout, and hidden dashboard hotkey.
- **[Admin Dashboard](../code_explanation/blog/Admin.md)** — Session auth, cover image Unsplash generator, and CRUD editors.
- **[Supabase API client](../code_explanation/blog/supabase.md)** — Connection details and typed interfaces.
- **[Database installer](../code_explanation/blog/supabase_migration.md)** — SQL schemas, RLS write policies, and 5 seed career articles.

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

*Last Updated: May 27, 2026*

