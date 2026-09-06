# ats_general_engine.md

**Location:** `prsnl/backend/app/services/ats_general_engine.py`  
**Type:** Scoring Engine

## What This File Does

Implements a comprehensive rule-based ATS scoring system that evaluates resume quality without needing a job description. It blends two scoring components 50/50: section quality (how well each section is written) and content quality (what the resume contains). The engine parses the resume into logical sections, then applies NLP heuristics including TF-IDF keyword density, Flesch reading ease, spell-checking, and action verb detection to produce a deterministic 0-100 score.

## How It Fits Into The System

- **Triggered by:** `ats_scoring.py` router when mode is `"general"`
- **Dependencies:** `pyspellchecker` (SpellChecker), `sklearn` (TfidfVectorizer), `textstat` (Flesch reading ease), standard NLP utilities
- **Dependents:** `ats_scoring.py` (router), frontend ATS score display

## Code Breakdown

### Resume Section Parsing

Splits the resume into recognized sections:
- **Header** — name, contact info, title
- **Education** — degrees, institutions, dates
- **Projects** — personal/professional projects
- **Experience** — work history, internships
- **Skills** — technical and soft skills
- **Achievements** — awards, certifications, publications

Uses heading detection heuristics (capitalized lines, common section headers) to identify boundaries.

### Section Quality Scoring (50% of total)

Evaluates each parsed section across multiple dimensions:
- **Grammar** — basic grammatical correctness signals
- **Clarity** — Flesch reading ease score (higher = more readable); penalizes overly complex sentences
- **Brevity** — appropriate length for each section type (experience can be longer; skills should be concise)
- **Structure** — consistent formatting (bullet points, parallel construction)
- **Conciseness** — penalizes filler words and redundant phrases
- **Spell-check** — uses `SpellChecker` to count typos; more typos = lower score
- **Keyword density** — TF-IDF analysis to ensure meaningful terms aren't buried in fluff

Each section gets a composite quality score, then they're averaged.

### Content Quality Scoring (50% of total)

Evaluates the resume's content regardless of writing quality:
- **Quantification** — counts numbers, percentages, metrics (e.g., "increased revenue by 40%")
- **Action verbs** — checks if bullet points start with strong verbs (Led, Built, Designed, Optimized)
- **Section coverage** — penalizes missing expected sections (no experience section = big penalty)
- **Contact info** — checks for email, phone, LinkedIn presence
- **Content density** — ratio of substantive content to whitespace/filler

### Score Blending and Compression

1. Section quality score (0-100) and content quality score (0-100) are averaged 50/50
2. **Compression above 65**: scores above 65 are compressed to prevent inflation
   - This means a "perfect" resume might score 85-90, not 100
   - Prevents the common problem where mediocre resumes score 90+ on simple heuristics
   - The compression formula reduces the marginal value of each point above 65

### compute_general_score Function

The main entry point:
1. Parses resume into sections
2. Computes section quality score
3. Computes content quality score
4. Blends 50/50
5. Applies compression above 65
6. Returns integer 0-100

## Things To Know Before Editing

- The 50/50 blend ratio between section quality and content quality is a design choice — adjusting it changes what the score emphasizes (writing quality vs. content substance)
- Score compression above 65 is intentional to prevent grade inflation — without it, almost any decent resume scores 85+, making the score meaningless for differentiation
- The section parser uses heuristic heading detection — unusual resume formats (creative resumes, single-column designs with non-standard headers) may parse incorrectly
- SpellChecker has a limited dictionary — technical terms (Kubernetes, GraphQL, etc.) will be flagged as misspellings; consider adding a tech-terms whitelist if this becomes a problem
- TF-IDF keyword density is computed per-section, not globally — this means a keyword repeated across sections isn't penalized the same way as repetition within one section
- Flesch reading ease expects English text — non-English resumes will get unreliable clarity scores
- The action verb list is hardcoded — if you want to expand it, look for the verb set/list in the file
- This engine is deterministic (no randomness, no LLM) — same input always produces same output, which is important for user trust
