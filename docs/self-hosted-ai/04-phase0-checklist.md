# 04 — Phase 0 Execution Checklist
### *Appendix 1 of the Kareerist Self-Hosted AI Models Blueprint*
**Audience:** Sprint Planning, Backend Engineers, and Product Leads  
**Timeline:** Week 1–2 (Zero GPU Infrastructure Required)

---

## Overview

These eleven tasks require no local GPU hardware, fine-tuning, or model weight downloads. Executing them directly on the existing FastAPI backend and commercial frontier API setup will capture **60–80% of the cost reductions and latency improvements immediately**, while creating the essential telemetry, security, and prompt versioning infrastructure needed for self-hosting later.

---

## Ticket-Ready Implementation Tasks

### [ ] P0-1: Configure Native Structured Outputs (JSON Schema)
* **Estimated Time:** 3 hours
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/services/llm_client.py`, `backend/app/schemas/resume.py`
* **Concrete Action:** Refactor commercial API requests to pass strict Pydantic JSON schemas via `response_format={"type": "json_schema", "json_schema": {...}}`. Delete all manual markdown-fencing strippers (`replace("```json", "")`) and fragile regex extractors.
* **Acceptance Criteria:** 0 syntax errors or JSON parsing exceptions across 1,000 consecutive production calls.

---

### [ ] P0-2: Centralize and Version Prompt Templates
* **Estimated Time:** 3 hours
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/prompts/career_templates.py`
* **Concrete Action:** Extract all inline system prompts, recruiter persona guidelines, and rubrics scattered across services into versioned constants (e.g. `PROMPT_DEEP_ANALYSIS_V1_4`). Nothing constructs a prompt inline.
* **Acceptance Criteria:** `grep -r "You are a" backend/app/` returns only references to the centralized prompt registry.

---

### [ ] P0-3: Standardize System Prompts for Cache Hits
* **Estimated Time:** 2 hours
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/prompts/career_templates.py`
* **Concrete Action:** Reorder prompt assemblies so that static instructions, scoring bands, and rubrics appear at the beginning of the prompt. Dynamic variables (candidate resume text, job descriptions) are placed strictly at the end.
* **Acceptance Criteria:** 40%+ drop in input-token cost observed on the API provider billing dashboard due to prefix prompt caching.

---

### [ ] P0-4: Implement Backend Circuit Breaker
* **Estimated Time:** 4 hours
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/services/llm_client.py`
* **Concrete Action:** Wrap the client in a `CircuitBreaker` pattern (3 consecutive failures trip the breaker; 60-second recovery cooldown). Add an automated fallback to a secondary commercial provider if the primary experiences an outage.
* **Acceptance Criteria:** Simulating a network drop on the primary provider routes traffic to the fallback provider without user-visible error or request drops.

---

### [ ] P0-5: Deconstruct Resume Analysis into Parallel Async Tasks
* **Estimated Time:** 2 days
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/services/resume_analysis.py`
* **Concrete Action:** Break the monolithic Deep Resume Analysis call into 6 parallel sub-requests (`contact`, `summary`, `experience`, `skills`, `education`, `verdict`). Execute concurrently via `asyncio.gather` and assemble into the final payload backend-side.
* **Acceptance Criteria:** Wall-clock response latency for full resume analysis drops by $\ge 50\%$; timeout failures drop to 0.

---

### [ ] P0-6: Deploy Server-Sent Events (SSE) Streaming
* **Estimated Time:** 3 days
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/api/v1/endpoints/resume.py`, `FRONTEND/src/components/ResumeAuditView.tsx`
* **Concrete Action:** Establish an SSE endpoint that pushes each parsed section to the client as soon as its individual async call resolves. Update the UI to render completed sections progressively.
* **Acceptance Criteria:** Perceived Time-to-First-Token (TTFT) observed by the candidate drops to $< 2.5\text{ seconds}$.

---

### [ ] P0-7: Implement Tiered Model Routing
* **Estimated Time:** 1 day
* **Value Rating:** ⭐⭐ (Medium Impact)
* **Target Files:** `backend/app/services/llm_client.py`
* **Concrete Action:** Route low-complexity tasks (Cover Letter Humanizer, Cover Letter Generator, Interview Question generation) to lightweight models (e.g. `gpt-4o-mini`). Reserve full-scale frontier models strictly for Deep Analysis and Hiring Intelligence.
* **Acceptance Criteria:** Immediate 40–60% reduction in blended token expenditures with zero degradation in user satisfaction.

---

### [ ] P0-8: Sanitize PDF Text Extraction
* **Estimated Time:** 4 hours
* **Value Rating:** ⭐⭐ (Medium Impact)
* **Target Files:** `backend/app/services/pdf_parser.py`
* **Concrete Action:** Add a sanitization middleware to the PDF extractor: strip zero-width spaces, normalize abnormal Unicode ligatures, collapse redundant whitespace, and filter out text rendered in sub-3pt font sizes or invisible font colors.
* **Acceptance Criteria:** Malformed and adversarial test PDFs yield clean, instruction-free text without breaking the parser.

---

### [ ] P0-9: Implement Hard Input Caps & Account Rate Limiting
* **Estimated Time:** 3 hours
* **Value Rating:** ⭐⭐ (Medium Impact)
* **Target Files:** `backend/app/api/v1/endpoints/resume.py`, `backend/app/middleware/rate_limit.py`
* **Concrete Action:** Enforce a hard ceiling of 6,000 tokens on extracted resume text; reject or summarize resumes exceeding this limit. Enforce Redis-backed per-account rate limits.
* **Acceptance Criteria:** Scripts attempting burst spam receive HTTP 429 Too Many Requests; runaway token spend is structurally blocked.

---

### [ ] P0-10: Deploy Demographic Bias Test Suite
* **Estimated Time:** 1 day
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `tests/evals/test_demographic_bias.py`
* **Concrete Action:** Construct a test script running 50 representative resumes through the scoring pipeline, programmatically swapping candidate names (gender-, religion-, and region-coded) and college tiers while holding qualifications constant.
* **Acceptance Criteria:** Baseline bias audit report generated; maximum observed score delta across demographic variants is documented.

---

### [ ] P0-11: Consented, PII-Scrubbed Logging
* **Estimated Time:** 1 day
* **Value Rating:** ⭐⭐⭐ (High Impact)
* **Target Files:** `backend/app/services/telemetry.py`
* **Concrete Action:** Audit user terms of service to verify data usage consent. Implement an automated PII anonymization pipeline that scrubs names, email addresses, phone numbers, and company names before logging completions to a secure dataset storage bucket.
* **Acceptance Criteria:** 1,000 real production prompts and completions stored in clean, PII-scrubbed JSONL format for future fine-tuning curation.

---

## Expected Phase 0 Outcome & Next Steps

Executing Phase 0 delivers:
1. **60–80% Cost Reduction:** Immediate savings achieved via prompt caching, tiered model routing, and sectioned parallelization.
2. **3x–4x Perceived Latency Improvement:** End-to-end SSE streaming combined with parallel async calls eliminates user spinner fatigue.
3. **Zero JSON Schema Errors:** Deterministic structured outputs eliminate parsing crashes across the product.
4. **Resilience & Fallback:** Outages from individual AI vendors no longer cause Kareerist platform downtime.
5. **Real-World Training Asset Accumulation:** PII-scrubbed production logs begin building the gold-standard dataset for future self-hosting.

### The Decision Checkpoint
Once Phase 0 is complete, re-run the **C1 Decision Gate**. If your monthly API expenses have dropped below $300/month, **stop and defer full self-hosting**. You have captured the financial gains without undertaking server maintenance.
