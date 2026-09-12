# 07 — Explicit Kill Criteria & Success Gates
### *Appendix 4 of the Kareerist Self-Hosted AI Models Blueprint*
**Audience:** Founders, Executive Leadership, and ML Technical Leads  
**Mandatory Review:** Before approving Week 10 production migrations

---

## Overview

The most challenging operational discipline in applied machine learning is knowing when to stop. Once an engineering team invests weeks in data pipelines, GPU clusters, and fine-tuning runs, the sunk-cost fallacy tempts teams to rationalize poor model performance or subsidize unviable hosting costs.

These kill criteria must be agreed upon **in advance**. If any of these conditions are triggered, decommission the self-hosted training effort and retain commercial frontier APIs.

---

## The Seven Explicit Kill Conditions

### [KILL CONDITION 1] Phase 0 Captures the Economic Win
* **Condition:** Phase 0 optimizations (prompt caching, structured outputs, sectioned async calls, tiered model routing) reduce monthly commercial API bills below **$300/month**.
* **Action:** **Stop self-hosting immediately.**
* **Rationale:** Dedicated GPU infrastructure costs ~$500–$900/month. If commercial APIs cost less than the fixed rent on a server, self-hosting is financial waste. You captured 80% of the benefit for two weeks of work; bank the win.

---

### [KILL CONDITION 2] The Win-Rate Ceiling Fails to Close
* **Condition:** After training on Rung 3 (9,000 samples), the blind pairwise win-rate against the commercial baseline remains below **35%**.
* **Action:** **Halt feature migration.**
* **Rationale:** The gap between the student model and the frontier model is not closing with volume. Either the foundational SLM lacks the reasoning capacity for that task, or the task requires high-order judgment that small models cannot support.

---

### [KILL CONDITION 3] The Model Cannot Discriminate Quality
* **Condition:** The Spearman rank correlation on the hand-ranked golden benchmark of 20 resumes remains below **$\rho = 0.50$** despite rubric anchoring and temperature 0 calibration.
* **Action:** **Do not deploy to production.**
* **Rationale:** The model cannot reliably distinguish an exceptional candidate from a disastrous one. Shipping this model provides misleading career advice, actively harming candidate outcomes and brand credibility.

---

### [KILL CONDITION 4] Algorithmic Demographic Bias Is Detected
* **Condition:** Demographic name-swapping or university-tier swapping across identical candidate qualifications produces a systematic score delta exceeding **3.0 points**.
* **Action:** **Block deployment immediately.**
* **Rationale:** Creates severe legal, ethical, and brand liability under automated employment decision regulations (e.g. NYC Local Law 144, EU AI Act, and DPDP Act). No infrastructure cost saving justifies deploying biased employment scoring.

---

### [KILL CONDITION 5] Engineering Budget Overflow
* **Condition:** The project consumes **250 engineering hours** without a single feature reaching 100% production traffic.
* **Action:** **Decommission the initiative.**
* **Rationale:** The project has exceeded its resource budget by more than 30%. Sunk-cost rationalization will continue draining product engineering velocity.

---

### [KILL CONDITION 6] Ownership and Maintenance Abandonment
* **Condition:** The engineer who built the training and inference pipeline transitions away from the project, and no engineer inherits dedicated operational ownership.
* **Action:** **Migrate 100% of traffic back to the commercial API fallback immediately.**
* **Rationale:** An unmaintained, unmonitored self-hosted cluster is strictly worse than an API. It will degrade silently, experience unhandled memory leaks, and wake unassigned engineers at 3 AM.

---

### [KILL CONDITION 7] Product Roadmap Blocking
* **Condition:** Maintaining the model or fine-tuning pipelines actively blocks shipping major core product features requested by users.
* **Action:** **Revert to commercial APIs.**
* **Rationale:** A working product backed by commercial APIs always beats a superior self-hosted architecture that ships four months late.

---

## Definition of Project Success

The self-hosted AI initiative is declared an unmitigated success when all of the following milestones are achieved:

* [x] **$\ge 90\%$** of routine career AI queries are handled smoothly by the self-hosted cluster.
* [x] **$\ge 45\%$** blind win/tie rate against commercial frontier models across golden evaluation sets.
* [x] **$\ge 40\%$** lower marginal cost per analysis compared to commercial APIs at current traffic levels.
* [x] **p95 Latency $< 20$ seconds** for complete multi-section resume audits via SSE streaming.
* [x] **100% High Availability** maintained via an automated circuit-breaker fallback.
* [x] **Zero Algorithmic Bias** across demographic variants, verified via automated CI test suites.
* [x] **Full MLOps Lineage:** Every production model checkpoint is 100% reproducible from its signed `manifest.json`.
* [x] **Hiring Intelligence intentionally retained on frontier models**, prioritizing candidate advisory quality over ideological self-reliance.

---

## Final Operational Takeaways

1. **Phase 0 comes first:** Never buy a GPU before implementing prompt caching and structured outputs.
2. **Build the eval harness before the data engine:** If you cannot measure quality objectively, you are operating on vibes.
3. **The fallback is permanent:** A plan that removes its safety net is fragile; a plan that retains a permanent circuit-breaker fallback survives contact with production.
