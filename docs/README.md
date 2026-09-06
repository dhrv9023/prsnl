# Kareerist Documentation Hub

Welcome to the centralized documentation repository for the **Kareerist** platform. This directory aggregates all technical specifications, system architecture diagrams, code walkthroughs, historical sprint archives, and security audit reports.

---

## Directory Navigation

```
docs/
├── specifications/     # Master system architecture, API specifications & AI handoff
├── architecture/       # Mermaid flowcharts and interactive HTML architecture viewer
├── security/           # CSRF, security headers, and protection mechanisms
├── explanations/       # Deep-dive code explanations (Backend, Frontend, DB, Blog)
├── history/            # Chronological development history (Chapters 1–12)
└── qa/                 # Comprehensive QA test reports and penetration audit findings
```

---

## 1. Specifications & Architecture

- **[Project Master Specification](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/specifications/kareerist_project_docs.md)**
  The comprehensive single-source specification covering technical architecture, database schemas, API routes, credit policies, AI pipelines, middleware stacks, and deployment configurations.
- **[Interactive Architecture Viewer](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/architecture_viewer.html)**
  A standalone browser-based tool to visually explore system components, data flows, and subsystem relationships.
- **[System Architecture Flowcharts](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/architecture/flowcharts/)**
  12 detailed Mermaid diagrams mapping the complete platform:
  - `diagram_01_system_overview.md`: High-level system topology
  - `diagram_02_auth_session.md`: Supabase auth & JWT cookie lifecycle
  - `diagram_03_route_map.md`: Complete API and frontend route map
  - `diagram_04_db_schema.md`: PostgreSQL ERD and table relationships
  - `diagram_05_frontend_components.md`: React component tree & state flow
  - `diagram_06_blog_system.md`: Micro-frontend blog architecture
  - `diagram_07_request_lifecycle.md`: Request/response pipeline & middleware
  - `diagram_08_error_failures.md`: Error boundaries & refund fallbacks
  - `diagram_09_deployments.md`: Multi-cloud production topology (Vercel/Render/Supabase)
  - `diagram_10_qa_tests.md`: Test suite coverage and matrix
  - `diagram_11_state_management.md`: React Query & Context architecture
  - `diagram_12_dependencies.md`: Package and third-party API dependencies

---

## 2. Security Documentation

- **[CSRF Protection Implementation](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/security/csrf_implementation.md)**
  Documentation of the double-submit cookie CSRF middleware, production deployment configurations, and local development testing methods.
- **[Security Audit & Penetration Testing Reports](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/)**
  Complete 10-part audit evaluating threat posture, vulnerability remediations, and automated security verification.

---

## 3. Code Explanations

In-depth technical guides explaining key source files and subsystems:

- **[Backend Explanations](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/explanations/backend/)**:
  - FastAPI routers (`auth.py`, `ai_analysis.py`, `interview.py`, `cover_letter.py`, `credits.py`)
  - AI pipelines (`llm_client.py`, `prompt_sanitizer.py`, `ai_retry.py`)
  - ATS scoring algorithms (`ats_general_engine.py`, `ats_jd_engine.py`, `math_engine.py`)
  - Middleware & configuration (`main.py`, `config.py`, `request_logger.py`, `rate_limit.py`)
- **[Frontend Explanations](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/explanations/frontend/)**:
  - Main application pages (`Index.tsx`, `ResumeAnalysis.tsx`, `AIInterview.tsx`, `CoverLetter.tsx`, `DashboardPage.tsx`, `AdminPage.tsx`)
  - State contexts (`AuthContext.tsx`, `CreditContext.tsx`, `RoastModeContext.tsx`)
  - Core components & layout (`Navbar.tsx`, `AuthModal.tsx`, `CreditDisplay.tsx`, `FeatureMarquee.tsx`)
- **[Database Explanations](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/explanations/database/)**:
  - Schema migrations, table definitions, and security policies (RLS)
  - Atomic PostgreSQL RPC functions (`deduct_credits`, `grant_daily_credits`, `refund_feature_credits`)
- **[Blog Explanations](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/explanations/blog/)**:
  - Architecture of the independent blog subproject and markdown CMS integration.

---

## 4. History & Evolution

Chronological sprint archives tracking how Kareerist evolved:

- **[Project Genesis & Chapters 1–12](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/history/)**:
  - `chapter_01_project_genesis_and_stack.md`
  - `chapter_02_backend_architecture.md`
  - `chapter_03_auth_and_security.md`
  - `chapter_04_ai_features_and_services.md`
  - `chapter_05_credit_system.md`
  - `chapter_06_frontend_architecture.md`
  - `chapter_07_database_and_migrations.md`
  - `chapter_08_infrastructure_and_deployment.md`
  - `chapter_09_security_audit_and_fixes.md`
  - `chapter_10_current_state_and_roadmap.md`
  - `chapter_11_voice_interview_and_tts.md`
  - `chapter_12_blog_system.md`

---

## 5. Quality Assurance & Pentest Audits

- **[Executive Summary (Part 1)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_1_EXECUTIVE_SUMMARY.md)**: Overall platform evaluation and score (8.8/10).
- **[Security Findings (Part 2 - Updated Sep 6, 2026)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_2_SECURITY_FINDINGS_UPDATED_SEP_06.md)**: Remediated audit findings.
- **[Functional Test Suite (Part 3)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_3_FUNCTIONAL_TESTING.md)**: 36 functional test cases covering core user journeys.
- **[Performance & Compatibility (Part 4)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_4_PERFORMANCE_UX_COMPAT.md)**: Load metrics, bundle sizes, and browser support.
- **[Test Coverage & Recommendations (Part 5)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_5_RECOMMENDATIONS_AND_COVERAGE.md)**: Test coverage analysis (37 automated tests).
- **[AI Pipeline Security (Part 9)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_9_AI_SECURITY_AUDIT.md)**: Prompt injection defenses, quota limits, and credit refund safeguards.
- **[Pentest Checklist (Part 10)](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/qa/PART_10_PENTEST_CHECKLIST.md)**: Verification of platform hardening.
