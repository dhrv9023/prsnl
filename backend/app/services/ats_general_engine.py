"""
Phase 2: rule-based ATS-style scoring (no JD, no LLM).

Two-component blend:
  - Section quality (60%): grammar, clarity, brevity, structure,
    conciseness, spell-check, keyword density — evaluated per section.
  - Content quality (40%): quantification, action verbs, contact info,
    section coverage, content density — whole-resume signals.
"""

from __future__ import annotations

import math
import re
from functools import lru_cache
from typing import Final

from sklearn.feature_extraction.text import TfidfVectorizer
from spellchecker import SpellChecker

# ─── Section ordering & detection ────────────────────────────────────────────

SECTION_ORDER: Final[tuple[str, ...]] = (
    "header",
    "education",
    "projects",
    "experience",
    "skills",
    "achievements",
)

SECTION_PATTERNS: Final[list[tuple[re.Pattern[str], str]]] = [
    (
        re.compile(
            r"^(?:education|academic\s+background|qualifications?)(?:\s*\([^)]*\))?\s*:?\s*$",
            re.I,
        ),
        "education",
    ),
    (re.compile(r"^(?:projects?|portfolio|side\s+projects?)\s*:?\s*$", re.I), "projects"),
    (
        re.compile(
            r"^(?:experience|employment|work\s+history|professional\s+experience|work\s+experience)\s*:?\s*$",
            re.I,
        ),
        "experience",
    ),
    (
        re.compile(
            r"^(?:skills?|technical\s+skills|core\s+competencies|technologies)\s*:?\s*$",
            re.I,
        ),
        "skills",
    ),
    (
        re.compile(r"^(?:achievements?|awards?|honou?rs?|certifications?)\s*:?\s*$", re.I),
        "achievements",
    ),
    (re.compile(r"^(?:profile|summary|objective|about)\s*:?\s*$", re.I), "header"),
]

# ─── Shared regex / constants ─────────────────────────────────────────────────

TOKEN_RE: Final[re.Pattern[str]] = re.compile(r"\b[a-zA-Z]{2,}\b")
SENTENCE_SPLIT: Final[re.Pattern[str]] = re.compile(r"[.!?]+(?:\s+|$)")

FILLER_WORDS: Final[frozenset[str]] = frozenset({
    "very", "really", "just", "basically", "actually", "literally",
    "quite", "rather", "somewhat", "simply", "various", "multiple",
    "several", "stuff", "things", "nice", "good", "great",
})

ACTION_VERBS: Final[frozenset[str]] = frozenset({
    "built", "developed", "designed", "implemented", "led", "managed",
    "created", "improved", "optimized", "reduced", "increased", "launched",
    "deployed", "architected", "engineered", "automated", "integrated",
    "delivered", "collaborated", "mentored", "scaled", "migrated",
    "refactored", "shipped", "owned", "drove", "spearheaded", "established",
    "streamlined", "accelerated", "achieved", "contributed", "maintained",
    "coordinated", "executed", "produced", "resolved", "transformed",
})

QUANT_RE: Final[re.Pattern[str]] = re.compile(
    r'\b\d+[\.,]?\d*\s*'
    r'(%|percent|k\b|m\b|million|billion|users|customers|requests|ms|'
    r'seconds|hours|days|weeks|months|years|x\b|times|members|employees|'
    r'projects|features|bugs|issues|tickets|stars|downloads|revenue|'
    r'latency|throughput|concurrent|daily|weekly|monthly)\b',
    re.I,
)


# ─── Spell checker (cached) ───────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _spell() -> SpellChecker:
    return SpellChecker(language="en")


# ─── Section parser ───────────────────────────────────────────────────────────

def parse_sections(raw: str) -> dict[str, str]:
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.split("\n")
    buckets: dict[str, list[str]] = {k: [] for k in SECTION_ORDER}
    current = "header"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            buckets[current].append("")
            continue
        matched: str | None = None
        for rx, name in SECTION_PATTERNS:
            if rx.match(stripped):
                matched = name
                break
        if matched:
            current = matched
            continue
        buckets[current].append(line)

    return {k: "\n".join(v).strip() for k, v in buckets.items()}


# ─── Section-level dimension scorers ─────────────────────────────────────────

def _syllable_estimate(word: str) -> int:
    w = word.lower().strip()
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    syl = len(re.findall(r"[aeiouy]+", w))
    return max(1, syl)


def _flesch_reading_ease(text: str) -> float:
    words = TOKEN_RE.findall(text)
    if len(words) < 5:
        return 40.0
    sentences = max(1, len(SENTENCE_SPLIT.split(text.strip())))
    syllables = sum(_syllable_estimate(w) for w in words)
    wps = len(words) / sentences
    spw = syllables / len(words)
    return 206.835 - 1.015 * wps - 84.6 * spw


def score_clarity(text: str) -> float:
    if not text:
        return 45.0
    fre = _flesch_reading_ease(text)
    if fre < 0:
        return 25.0
    if fre > 100:
        return 95.0
    return float(max(0.0, min(100.0, 55.0 + (fre - 50.0) * 0.9)))


def score_grammar(text: str) -> float:
    if not text or len(text) < 10:
        return 55.0
    penalties = 0.0
    if re.search(r"\s{3,}", text):
        penalties += 8
    if re.search(r"[.?!,;:]{2,}", text):
        penalties += 6
    if re.search(r"\bi\b", text):
        penalties += 5
    bad_starts = len(re.findall(r"(?<=[.!?])\s+[a-z]", text))
    penalties += min(20.0, bad_starts * 3.0)
    return float(max(0.0, 100.0 - penalties))


def score_brevity(text: str) -> float:
    words = TOKEN_RE.findall(text)
    if not words:
        return 30.0
    sentences = max(1, len(SENTENCE_SPLIT.split(text.strip())))
    wps = len(words) / sentences
    if wps <= 8:
        return 55.0 + wps * 2.5
    if wps <= 20:
        return 95.0 - abs(wps - 14.0) * 3.0
    return float(max(25.0, 95.0 - (wps - 20.0) * 3.5))


def score_structure(text: str) -> float:
    if not text:
        return 20.0
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return 25.0
    bullets = sum(
        1
        for ln in lines
        if re.match(r"^[\u2022\u2023\u25E6\u2043\-\*\u00B7•◦▪►]\s+", ln)
        or re.match(r"^[\-\*]\s+", ln)
        or re.match(r"^\d+[\).\s]", ln)
    )
    ratio = bullets / len(lines)
    if ratio < 0.2:
        line_score = 20.0 + ratio * 100.0
    else:
        line_score = min(100.0, 35.0 + ratio * 90.0)
    para_breaks = text.count("\n\n")
    para_bonus = min(15.0, para_breaks * 3.0)
    return float(max(0.0, min(100.0, line_score * 0.85 + para_bonus)))


def score_conciseness(text: str) -> float:
    words = [w.lower() for w in TOKEN_RE.findall(text)]
    if not words:
        return 40.0
    fillers = sum(1 for w in words if w in FILLER_WORDS)
    density = fillers / len(words)
    return float(max(20.0, 100.0 - density * 500.0))


def score_spell_check(text: str) -> float:
    words = [w.lower() for w in TOKEN_RE.findall(text)]
    if not words:
        return 45.0
    spell = _spell()
    unknown = 0
    checked = 0
    for w in words:
        if len(w) <= 2 or w.isupper():
            continue
        checked += 1
        if w not in spell:
            unknown += 1
    if checked == 0:
        return 60.0
    err_rate = unknown / checked
    return float(max(10.0, 100.0 - err_rate * 150.0))


def _section_tfidf_scores(section_texts: list[str]) -> list[float]:
    if not section_texts:
        return []
    nonempty = [t for t in section_texts if t and TOKEN_RE.findall(t)]
    if not nonempty:
        return [40.0 for _ in section_texts]
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=400,
            min_df=1,
            token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]{2,}\b",
        )
        mat = vectorizer.fit_transform(nonempty)
    except ValueError:
        return [55.0 for _ in section_texts]

    scores: list[float] = []
    for i in range(mat.shape[0]):
        row = mat.getrow(i)
        if row.nnz == 0:
            scores.append(45.0)
        else:
            scores.append(float(min(100.0, row.data.mean() * 180.0 + 35.0)))

    out: list[float] = []
    j = 0
    for t in section_texts:
        if t and TOKEN_RE.findall(t):
            out.append(scores[j])
            j += 1
        else:
            out.append(40.0)
    return out


def _dimension_scores_for_section(
    _section: str,
    text: str,
    tfidf_score: float,
) -> dict[str, float]:
    return {
        "grammar": score_grammar(text),
        "clarity": score_clarity(text),
        "brevity": score_brevity(text),
        "structure": score_structure(text),
        "conciseness": score_conciseness(text),
        "spell_check": score_spell_check(text),
        "keyword_density": tfidf_score,
    }


# ─── Whole-resume content quality ────────────────────────────────────────────

def _content_quality_bonus(resume_text: str) -> float:
    """
    Global content quality score (0–100) based on signals that the
    section-level text-quality dimensions cannot detect:
      - Quantified achievements (numbers/metrics)  → 0–30 pts
      - Action verbs                               → 0–25 pts
      - Key section coverage                       → 0–20 pts
      - Contact info                               → 0–15 pts
      - Content density (word count)               → 0–10 pts
    """
    text_lower = resume_text.lower()
    word_count = len(resume_text.split())

    # 1. Quantification — most differentiating signal
    quant_hits = len(QUANT_RE.findall(resume_text))
    quant_pts = min(30, quant_hits * 5)

    # 2. Action verbs
    verb_hits = sum(1 for v in ACTION_VERBS if v in text_lower)
    verb_pts = min(25, verb_hits * 3)

    # 3. Section coverage
    section_keywords = {
        "experience": ["experience", "work history", "employment"],
        "skills":     ["skills", "technologies", "tech stack", "tools"],
        "education":  ["education", "degree", "university", "college",
                       "bachelor", "master", "b.tech", "m.tech", "b.e"],
        "projects":   ["projects", "portfolio", "side projects"],
    }
    section_hits = sum(
        1 for kws in section_keywords.values()
        if any(kw in text_lower for kw in kws)
    )
    section_pts = section_hits * 5  # 5 pts each, max 20

    # 4. Contact info
    has_email   = bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', resume_text))
    has_phone   = bool(re.search(r'(\+?\d[\d\s\-().]{7,}\d)', resume_text))
    has_profile = bool(re.search(r'(linkedin|github|gitlab|portfolio|behance)', text_lower))
    contact_pts = (7 if has_email else 0) + (4 if has_phone else 0) + (4 if has_profile else 0)

    # 5. Content density
    if word_count >= 350:
        density_pts = 10
    elif word_count >= 200:
        density_pts = 7
    elif word_count >= 100:
        density_pts = 4
    else:
        density_pts = 1

    total = quant_pts + verb_pts + section_pts + contact_pts + density_pts
    return float(max(0, min(100, total)))


# ─── Main entry point ─────────────────────────────────────────────────────────

def compute_general_score(resume_text: str) -> int:
    """
    Aggregate section × dimension scores into one 0–100 integer.

    Two-component blend:
      - Section quality (60% weight): grammar, clarity, brevity, structure,
        conciseness, spell-check, keyword density — per section.
      - Content quality (40% weight): quantification, action verbs, contact
        info, section coverage, content density — whole-resume signals.

    This ensures a well-written but empty resume doesn't score the same
    as a well-written resume with real achievements and metrics.
    """
    sections = parse_sections(resume_text)
    texts = [sections[k] for k in SECTION_ORDER]
    tfidf_per_section = _section_tfidf_scores(texts)

    weighted_sum = 0.0
    weight_total = 0.0

    for name, text, tfd in zip(SECTION_ORDER, texts, tfidf_per_section, strict=True):
        dims = _dimension_scores_for_section(name, text, tfd)
        vals = list(dims.values())
        section_mean = float(sum(vals) / len(vals))
        char_len = len(text.strip())
        if char_len < 15:
            section_mean = section_mean * 0.50 + 15.0
        weight = math.sqrt(char_len + 40.0)
        weighted_sum += section_mean * weight
        weight_total += weight

    section_score = (weighted_sum / weight_total) if weight_total > 0 else 0.0

    # Content quality: quantification, action verbs, contact info, sections
    content_score = _content_quality_bonus(resume_text)

    # Blend: 50% section quality + 50% content quality
    # Content quality carries equal weight because section-level text signals
    # (grammar, clarity) can't distinguish a filler-sentence resume from a
    # real one — only content signals (metrics, verbs, sections) can.
    raw = section_score * 0.50 + content_score * 0.50

    # Compress scores above 65 to prevent inflation
    if raw > 65:
        raw = 65.0 + (raw - 65.0) * 0.60

    return int(max(0, min(100, round(raw))))
