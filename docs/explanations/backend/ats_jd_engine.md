# ats_jd_engine.md

**Location:** `prsnl/backend/app/services/ats_jd_engine.py`  
**Type:** Scoring Engine

## What This File Does

A thin wrapper around `math_engine.ats_score` that handles input preparation for job-description-based scoring. Its primary responsibility is truncating the resume and job description to safe lengths before passing them to the embedding engine. This prevents token overflow in the HuggingFace embedding model and keeps API costs predictable. The actual scoring math (embedding + cosine similarity + rescaling) lives in `math_engine.py`.

## How It Fits Into The System

- **Triggered by:** `ats_scoring.py` router when mode is `"jd"`
- **Dependencies:** `math_engine.ats_score` (embedding-based scoring), `math_engine.clean_text` (text preprocessing)
- **Dependents:** `ats_scoring.py` (router), which returns the score to the frontend

## Code Breakdown

### compute_jd_score Function

1. **Truncates resume** to 15,000 characters — prevents excessively long resumes from overwhelming the embedding model or exceeding API payload limits
2. **Truncates job description** to 12,000 characters — JDs are typically shorter than resumes, but some enterprise postings can be very long
3. Calls `math_engine.ats_score(truncated_resume, truncated_jd)` which handles:
   - Text cleaning
   - Embedding generation via HuggingFace
   - Cosine similarity computation
   - Score rescaling from [0.25, 0.70] to [25, 95]
4. Returns an **integer 0-100** score

### Why Truncation Matters

- The `all-mpnet-base-v2` model has a 512 token context window — text beyond this is silently ignored
- Even though the model truncates internally, sending 50K characters wastes bandwidth and increases latency
- The 15K/12K limits are generous enough to capture the full content of 99% of resumes and JDs while preventing abuse (e.g., someone pasting an entire document)

## Things To Know Before Editing

- The 15K character limit for resumes and 12K for JDs are empirical choices — they're well above typical lengths but below API payload limits; adjust only if you have a specific reason
- This file does NOT contain scoring logic — if scores seem wrong, look at `math_engine.py` instead
- Truncation is character-based, not token-based — a resume with lots of short words will have more tokens than one with long words at the same character count; the embedding model's internal 512-token limit is the real constraint
- The return type is `int` (not float) — the score is rounded before returning; if you need decimal precision, you'd need to modify both this and the response model
- If you add preprocessing steps (e.g., removing headers, stripping formatting), add them BEFORE the truncation to ensure the most meaningful content is preserved within the character limit
