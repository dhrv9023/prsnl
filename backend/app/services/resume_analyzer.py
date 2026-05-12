# app/services/resume_analyzer.py
# Roast feature removed. This module is a stub retained for future services.

import re


def clean_llm_answer(text: str) -> str:
    """Removes markdown formatting (```json ... ```) from LLM output."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text)
        text = re.sub(r"```$", "", text)
    return text.strip()
