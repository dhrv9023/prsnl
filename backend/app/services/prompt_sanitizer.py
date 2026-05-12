# app/services/prompt_sanitizer.py
"""
Shared prompt-injection sanitizer for all AI services.

Strips or escapes XML-style delimiter tags from user-provided text
before injecting it into LLM prompts. This prevents malicious users
from "breaking out" of the sandboxed data block.

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


def sanitize_user_text(text: str) -> str:
    """
    Remove any literal XML delimiter tags that our prompts use as
    data-boundaries. This prevents prompt-injection via tag escaping.

    Returns the cleaned string.
    """
    if not text:
        return text
    return _DANGEROUS_TAGS.sub("", text)
