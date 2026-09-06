# app/services/prompt_sanitizer.py
"""
Shared prompt-injection sanitizer for all AI services.

Strips or escapes XML-style delimiter tags from user-provided text
before injecting it into LLM prompts. This prevents malicious users
from "breaking out" of the sandboxed data block.

Also strips common natural-language injection patterns that attempt
to override system instructions.

Usage:
    from app.services.prompt_sanitizer import sanitize_user_text
    clean = sanitize_user_text(raw_resume_text)
"""

import re
import unicodedata

# Tags used as delimiters in our prompts.
# We strip both opening and closing variants so attackers can't
# prematurely close the data sandbox.
_DANGEROUS_TAGS = re.compile(
    r"</?(?:RESUME_TEXT|JOB_DESCRIPTION|COVER_LETTER|USER_ANSWER|CANDIDATE_ANSWER)>",
    re.IGNORECASE,
)

# Common natural-language prompt injection and extraction patterns.
# These attempt to override system instructions embedded in user data
# or trick the LLM into leaking its system prompts.
_INJECTION_PATTERNS = re.compile(
    r"(?:"
    r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|repeat\s+(your|the)\s+(system|initial|original)\s+(message|prompt|instructions?)"
    r"|what\s+are\s+your\s+(instructions?|rules?|guidelines?|prompts?)"
    r"|output\s+(the|your)\s+(text|prompt|instructions?|system)\s+(above|before)"
    r"|reveal\s+(your|the)\s+(system|hidden)"
    r"|you\s+are\s+now\s+(?:a\s+)?(?:an?\s+)?\w+"
    r"|act\s+as\s+(?:a\s+)?(?:an?\s+)?\w+"
    r"|new\s+instructions?:"
    r"|system\s*:\s*"
    r"|<\s*/?system\s*>"
    r"|<\s*/?instructions?\s*>"
    r")",
    re.IGNORECASE,
)

_HTML_COMMENTS = re.compile(r"<!--.*?-->", re.DOTALL)


def sanitize_user_text(text: str) -> str:
    """
    Remove prompt-injection attempts from user-provided text before it is
    injected into LLM prompts.

    Hardened steps:
    1. Unicode NFKC normalization (prevents homoglyph and fullwidth tag bypasses).
    2. Strip HTML comments (which may hide instructions).
    3. Multi-pass tag stripping (prevents nested/reconstructed tag reconstruction).
    4. Strip natural-language override & extraction phrases.

    Returns the cleaned string.
    """
    if not text:
        return text

    # Normalize unicode to standard ASCII lookalikes (e.g. ＜RESUME_TEXT＞ -> <RESUME_TEXT>)
    text = unicodedata.normalize("NFKC", text)

    # Strip HTML comments
    text = _HTML_COMMENTS.sub("", text)

    # Multi-pass delimiter tag removal to catch nested tag injection: <RES<RESUME_TEXT>UME_TEXT>
    for _ in range(3):
        prev = text
        text = _DANGEROUS_TAGS.sub("", text)
        if text == prev:
            break

    # Strip injection and system prompt extraction patterns
    text = _INJECTION_PATTERNS.sub("[removed]", text)
    return text
