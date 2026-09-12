# Kareerist Self-Hosted AI Models Hub

Welcome to the modular documentation hub for **Kareerist-Core**, our in-house, self-hosted AI models strategy and execution blueprint.

---

## Document Index & Reading Order

```
docs/self-hosted-ai/
├── 00-summary.md          # Part D — Executive summary, financial break-even & decision gates (Start here for funding/ROI)
├── 01-plain-english.md    # Part A — Conceptual onboarding guide to SLMs, fine-tuning & serving (For engineering onboarding)
├── 02-audit.md            # Part B — Brutal technical audit of 34 loopholes, legal pitfalls & ToS risks (Read before engineering)
├── 03-blueprint-v2.md     # Part C — Corrected execution plan (Phase 0–6, training scripts & serving code)
├── 04-phase0-checklist.md # Appendix 1 — Ticket-ready zero-GPU tasks for 60–80% immediate savings (Sprint tasks for Week 1)
├── 05-eval-harness.md     # Appendix 2 — Complete automated benchmark & scorecard code (`run_eval.py`)
├── 06-failure-playbook.md # Appendix 3 — Diagnostic triage table for 3 AM production debugging
└── 07-kill-criteria.md    # Appendix 4 — Explicit conditions for terminating self-hosting (Read before Week 10)
```

---

## Quick Navigation

| Document | Primary Audience | Core Focus |
| :--- | :--- | :--- |
| **[00 — Summary & Funding Brief](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/00-summary.md)** | Leadership & Investors | One-page summary, financial break-even formula ($750/mo vs $0.025/call $\rightarrow$ ~500 DAU), and project success gates. |
| **[01 — Plain-English Guide](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/01-plain-english.md)** | All Engineers & PMs | Plain-English explanations of SLMs, weights, LoRA/QLoRA, KV caches, PagedAttention, and feature difficulty ratings. |
| **[02 — Technical Audit](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/02-audit.md)** | Lead Architects & Legal | Brutal audit of 34 loopholes: ToS distillation breaches, 10x token cost under-estimates, context truncation bugs, and hiring bias. |
| **[03 — Execution Blueprint v2.0](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/03-blueprint-v2.md)** | ML & Backend Platform | 14-week plan, complete `train_kareerist.py`, `llm_client.py` with circuit breaker, and multi-LoRA vLLM daemon. |
| **[04 — Phase 0 Checklist](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/04-phase0-checklist.md)** | Sprint Engineers | 11 zero-GPU ticket-ready actions capturing 60–80% cost reduction and 3x–4x latency improvement this week. |
| **[05 — Evaluation Harness](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/05-eval-harness.md)** | QA & Benchmark Leads | Automated evaluation suite (`eval/run_eval.py`) for schema validity, hallucinations, Spearman rank, and bias checks. |
| **[06 — Failure-Mode Playbook](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/06-failure-playbook.md)** | On-Call Engineers | Diagnostic matrix mapping 15 failure symptoms to root causes and concrete remediation procedures. |
| **[07 — Kill Criteria](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/self-hosted-ai/07-kill-criteria.md)** | Founders & Tech Leads | 7 explicit conditions to abort self-hosting and remain on commercial frontier APIs. |

*(For the monolithic master document containing all sections in one file, see [`docs/specifications/SELF_HOSTED_AI_MODELS_BLUEPRINT.md`](file:///home/dhruv/Nextcloud/kareerist/prsnl/docs/specifications/SELF_HOSTED_AI_MODELS_BLUEPRINT.md)).*
