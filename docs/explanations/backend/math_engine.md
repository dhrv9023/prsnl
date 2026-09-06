# math_engine.md

**Location:** `prsnl/backend/app/services/math_engine.py`  
**Type:** Scoring Engine

## What This File Does

Implements two distinct resume scoring modes: semantic similarity scoring (when a job description is provided) using HuggingFace sentence-transformer embeddings with cosine similarity, and rule-based general scoring (without a JD) across 6 measurable dimensions. This is the core mathematical engine that produces the ATS compatibility score — no LLM calls, just embeddings and heuristics. The semantic mode answers "how well does this resume match this specific job?" while the rule-based mode answers "is this resume well-constructed in general?"

## How It Fits Into The System

- **Triggered by:** `ats_jd_engine.py` (for JD mode) and `ats_general_engine.py` (for general mode) — this file provides the low-level scoring primitives
- **Dependencies:** HuggingFace Inference API (for embeddings), `sentence-transformers/all-mpnet-base-v2` model, numpy/scipy for cosine similarity
- **Dependents:** `ats_scoring.py` (router), `ats_jd_engine.py`, `ats_general_engine.py`

## Code Breakdown

### clean_text

A preprocessing utility that:
- Removes non-ASCII characters (emojis, special symbols that confuse embeddings)
- Normalizes whitespace (collapses multiple spaces/newlines into single spaces)
- Strips leading/trailing whitespace
- This ensures consistent input to both the embedding model and rule-based scorers

### get_embedding

- Calls the HuggingFace Inference API with the `sentence-transformers/all-mpnet-base-v2` model
- Returns a 768-dimensional embedding vector for the input text
- Used to embed both the resume and job description for comparison
- Handles API errors gracefully (returns None or raises)

### Semantic Similarity Scoring (JD Mode)

The `ats_score` function (or similar) for JD mode:
1. Cleans both resume text and JD text
2. Gets embeddings for both via `get_embedding`
3. Computes **cosine similarity** between the two vectors
4. **Rescales** the raw similarity from the range `[0.25, 0.70]` to `[25, 95]`:
   - Raw cosine similarity between two documents typically falls in 0.25–0.70 range
   - A score of 0.25 (very dissimilar) maps to 25/100
   - A score of 0.70 (very similar) maps to 95/100
   - Linear interpolation between these bounds
   - Scores below 0.25 floor at 25; scores above 0.70 cap at 95
   - This produces intuitive, human-readable scores (not raw 0.45 values)

### Rule-Based General Scoring (No JD Mode)

Scores across 6 dimensions without needing a job description:
1. **Content density** — ratio of meaningful content to filler/whitespace
2. **Quantification** — presence of numbers, metrics, percentages (shows impact)
3. **Action verbs** — starts bullet points with strong verbs (Led, Built, Increased)
4. **Section coverage** — has expected sections (experience, education, skills, etc.)
5. **Contact info** — includes email, phone, LinkedIn, location
6. **Formatting** — consistent structure, appropriate length, no walls of text

Each dimension produces a sub-score that's combined into the final 0-100 score.

## Things To Know Before Editing

- The rescaling range `[0.25, 0.70] → [25, 95]` was calibrated empirically — changing these bounds will shift all JD-mode scores across the platform; test extensively before modifying
- `all-mpnet-base-v2` has a **512 token limit** — text beyond this is truncated by the model silently; the upstream `ats_jd_engine.py` truncates inputs to prevent this, but be aware of the limit
- The HuggingFace Inference API has rate limits — if you're seeing 429 errors, that's why; consider caching embeddings for repeated analyses of the same resume
- Cosine similarity between documents is typically 0.2–0.8 — values outside this range suggest a bug in embedding or text preprocessing
- The rule-based scorer is intentionally simpler than the LLM-based analysis — it's meant to be fast and deterministic, not comprehensive
- `clean_text` removing non-ASCII means resumes in non-Latin scripts will lose content — this is a known limitation for the embedding mode
