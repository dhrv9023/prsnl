# app/services/resume_analyzer.py
# Roast feature removed. This module is a stub retained for future services.

import re


def clean_llm_answer(text: str) -> str:
    """Removes markdown formatting (```json ... ```) from LLM output."""
    if not text:
        return ""
    text = text.strip()
    # Check for complete code fences wrapping the text
    fence_match = re.search(r"^```(?:json)?\s*([\s\S]*?)\s*```$", text, flags=re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE)
        text = re.sub(r"```$", "", text)
    return text.strip()
