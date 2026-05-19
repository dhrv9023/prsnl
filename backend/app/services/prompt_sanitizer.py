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

# Tags used as delimiters in our prompts.
# We strip both opening and closing variants so attackers can't
# prematurely close the data sandbox.
_DANGEROUS_TAGS = re.compile(
    r"</?(?:RESUME_TEXT|JOB_DESCRIPTION|COVER_LETTER|USER_ANSWER|CANDIDATE_ANSWER)>",
    re.IGNORECASE,
)

# Common natural-language prompt injection patterns.
# These attempt to override system instructions embedded in user data.
_INJECTION_PATTERNS = re.compile(
    r"(?:"
    r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|forget\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|context|rules?)"
    r"|you\s+are\s+now\s+(?:a\s+)?(?:an?\s+)?\w+"
    r"|act\s+as\s+(?:a\s+)?(?:an?\s+)?\w+"
    r"|new\s+instructions?:"
    r"|system\s*:\s*"
    r"|<\s*/?system\s*>"
    r"|<\s*/?instructions?\s*>"
    r")",
    re.IGNORECASE,
)


def sanitize_user_text(text: str) -> str:
    """
    Remove prompt-injection attempts from user-provided text before it is
    injected into LLM prompts.

    Two passes:
    1. Strip XML delimiter tags that match our prompt boundaries.
    2. Strip common natural-language override phrases.

    Returns the cleaned string.
    """
    if not text:
        return text
    text = _DANGEROUS_TAGS.sub("", text)
    text = _INJECTION_PATTERNS.sub("[removed]", text)
    return text
