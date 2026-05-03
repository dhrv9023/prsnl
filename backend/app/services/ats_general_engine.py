"""
Phase 2: rule-based ATS-style scoring (no JD, no LLM).
Sections: header, education, projects, experience, skills, achievements.
Dimensions per section: grammar, clarity, brevity, structure, conciseness, spell_check, keyword_density.
"""

from __future__ import annotations

import math
import re
from functools import lru_cache
from typing import Final

from sklearn.feature_extraction.text import TfidfVectorizer
from spellchecker import SpellChecker

SECTION_ORDER: Final[tuple[str, ...]] = (
    "header",
    "education",
    "projects",
    "experience",
    "skills",
    "achievements",
)

# Line must match entirely (after strip) to start a section.
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

TOKEN_RE: Final[re.Pattern[str]] = re.compile(r"\b[a-zA-Z]{2,}\b")
SENTENCE_SPLIT: Final[re.Pattern[str]] = re.compile(r"[.!?]+(?:\s+|$)")
FILLER_WORDS: Final[frozenset[str]] = frozenset(
    {
        "very",
        "really",
        "just",
        "basically",
        "actually",
        "literally",
        "quite",
        "rather",
        "somewhat",
        "simply",
        "various",
        "multiple",
        "several",
        "stuff",
        "things",
        "nice",
        "good",
        "great",
    }
)


@lru_cache(maxsize=1)
def _spell() -> SpellChecker:
    return SpellChecker(language="en")


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
    """Map Flesch Reading Ease to 0–100 (resume-friendly band)."""
    if not text:
        return 45.0
    fre = _flesch_reading_ease(text)
    # Target band ~35–65 for professional prose; soften extremes.
    if fre < 0:
        return 25.0
    if fre > 100:
        return 95.0
    # Peak comfort near FRE 50
    return float(max(0.0, min(100.0, 55.0 + (fre - 50.0) * 0.9)))


def score_grammar(text: str) -> float:
    if not text or len(text) < 10:
        return 55.0
    penalties = 0.0
    if re.search(r"\s{3,}", text):
        penalties += 8
    if re.search(r"[.?!,;:]{2,}", text):
        penalties += 6
    if re.search(r"\bi\b", text):  # stray "i"
        penalties += 5
    # Lowercase right after period (heuristic)
    bad_starts = len(re.findall(r"(?<=[.!?])\s+[a-z]", text))
    penalties += min(20.0, bad_starts * 3.0)
    return float(max(0.0, 100.0 - penalties))


def score_brevity(text: str) -> float:
    words = TOKEN_RE.findall(text)
    if not words:
        return 45.0
    sentences = max(1, len(SENTENCE_SPLIT.split(text.strip())))
    wps = len(words) / sentences
    # Ideal ~10–22 words/sentence
    if wps <= 10:
        return 70.0 + wps * 2.0
    if wps <= 22:
        return 100.0 - abs(wps - 16.0) * 2.5
    return float(max(35.0, 100.0 - (wps - 22.0) * 2.0))


def score_structure(text: str) -> float:
    if not text:
        return 30.0
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return 35.0
    bullets = sum(
        1
        for ln in lines
        if re.match(r"^[\u2022\u2023\u25E6\u2043\-\*\u00B7•◦▪►]\s+", ln)
        or re.match(r"^[\-\*]\s+", ln)
        or re.match(r"^\d+[\).\s]", ln)
    )
    ratio = bullets / len(lines)
    line_score = min(100.0, 50.0 + ratio * 80.0)
    para_breaks = text.count("\n\n")
    para_bonus = min(20.0, para_breaks * 4.0)
    return float(max(0.0, min(100.0, line_score * 0.85 + para_bonus)))


def score_conciseness(text: str) -> float:
    words = [w.lower() for w in TOKEN_RE.findall(text)]
    if not words:
        return 50.0
    fillers = sum(1 for w in words if w in FILLER_WORDS)
    density = fillers / len(words)
    return float(max(25.0, 100.0 - density * 400.0))


def score_spell_check(text: str) -> float:
    words = [w.lower() for w in TOKEN_RE.findall(text)]
    if not words:
        return 55.0
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
        return 75.0
    err_rate = unknown / checked
    return float(max(15.0, 100.0 - err_rate * 120.0))


def _section_tfidf_scores(section_texts: list[str]) -> list[float]:
    """Higher when section uses distinctive terms vs other sections."""
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
    # Map back to original section_texts order including empties
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


def compute_general_score(resume_text: str) -> int:
    """
    Aggregate section × dimension scores into one 0–100 integer.
    Missing sections get a moderate neutral contribution so sparse resumes don't collapse to zero.
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
        # Empty: penalize structure-heavy dimensions implicitly via low means from heuristics
        char_len = len(text.strip())
        if char_len < 15:
            section_mean = section_mean * 0.65 + 22.0
        weight = math.sqrt(char_len + 40.0)
        weighted_sum += section_mean * weight
        weight_total += weight

    if weight_total <= 0:
        return 0
    raw = weighted_sum / weight_total
    return int(max(0, min(100, round(raw))))
