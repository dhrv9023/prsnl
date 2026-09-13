# resume_pdf_generator.md

**Location:** `prsnl/backend/app/services/resume_pdf_generator.py`  
**Type:** PDF & Document Generation Service

## What This File Does

Compiles clean, ATS-optimized single-column PDF resumes using ReportLab Platypus. It parses structured AI suggestions generated during Deep Analysis, matches and replaces weak bullet points in the original resume text with improved versions, and renders a professionally formatted, parseable PDF document.

## How It Fits Into The System

- **Triggered by:** The `POST` and `GET /api/v1/resumes/{resume_id}/optimized_pdf` endpoints in `resumes.py`.
- **Dependencies:** ReportLab (`SimpleDocTemplate`, `Paragraph`, `Spacer`, `HRFlowable`), `re` for regex parsing and whitespace normalization, `xml.sax.saxutils.escape` for Platypus XML entity escaping.
- **Dependents:** Candidates downloading their optimized PDF resume directly from the resume analysis interface, and the automated test suite in `backend/tests/test_resume_pdf_generator.py`.

## Code Breakdown

### Section Detection (`is_section_header`)

Uses a curated lookup set of standardized resume keywords (`summary`, `experience`, `projects`, `education`, `skills`, `certifications`, `achievements`, etc.) and regex stripping to identify section headers within raw resume text.

### Issue String Parser (`parse_issue_string`)

Parses structured critique strings returned by Deep Analysis:
- `Original bullet → Critique → Fix: ...` (3-part format)
- `Original bullet -> Fix: ...` (2-part format)

Extracts `original`, `critique`, and `fix` strings while stripping extra formatting quotes and markdown delimiters.

### Bullet Replacement Engine (`apply_replacements`)

Surgically updates weak bullets in the resume text with their AI improvements through a 3-tier fallback strategy:
1. **Direct String Match:** Exact match of original text.
2. **Cleaned Original Match:** Strips common bullet point symbols (`•`, `◦`, `▪`, `-`, `*`) from the search key.
3. **Whitespace-Normalized Regex Match:** Compares normalized word tokens and applies case-insensitive regex substitution to accommodate formatting differences.

### Document Compilation (`generate_resume_pdf`)

Constructs the PDF using ReportLab Platypus:
- **Geometry:** Standard Letter size with 0.5-inch margins for maximum content density without clipping.
- **Typography:** Standard ATS-compliant Helvetica fonts (`Helvetica-Bold` for titles and sections, `Helvetica` for body text).
- **Dividers:** Thin horizontal rules (`HRFlowable`) demarcating major sections.
- **Entity Escaping:** Escapes all raw text characters (`&`, `<`, `>`) into XML entities so Platypus does not crash on unescaped HTML-like characters in resumes.

## Things To Know Before Editing

- **Do not introduce multi-column table layouts:** Many ATS scanners fail when parsing multi-column text tables or nested frames. Single-column Platypus flowables guarantee universal readability.
- **XML escaping is mandatory:** ReportLab's `Paragraph` interprets text as XML. Any unescaped `&` or `<` in a candidate's resume (e.g., "C++ & Python", "Skills <5 years") will raise a parser crash if not escaped via `escape()`.
- **Action prefix stripping:** When replacing bullets, `clean_fix` automatically strips common model prefixes like `"Fix:"`, `"Rewrite:"`, or `"Add:"` to keep the final resume text natural and clean.
