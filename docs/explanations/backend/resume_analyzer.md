# resume_analyzer.py

**Location:** `prsnl/backend/app/services/resume_analyzer.py`  
**Type:** Service module (Stub / Legacy)

## What This File Does

This file is a lightweight utility module that has been reduced to a single helper function: `clean_llm_answer`. Originally, this module housed the application's "Resume Roast" engine (an early feature designed to provide sarcastic critiques of resumes). Following a refactoring where the Roast feature was moved or retired from core analytics, this file was retained as a clean stub to prevent breaking import links and support future resume analysis expansion.

## How It Fits Into The System

- **What triggers it:** It is imported by other backend services (e.g. legacy endpoint tests or components) that need to parse raw outputs from LLM calls.
- **What it depends on:** `re` (Python standard library regular expressions module).
- **What depends on it:** Any service that requires cleaning of markdown wrappers from legacy pipelines, though modern modules use the shared clean-up helpers in `llm_client.py`.

## Code Breakdown

### `clean_llm_answer` function
**Lines:** 7–13  
A simple string post-processing utility:
```python
def clean_llm_answer(text: str) -> str:
    """Removes markdown formatting (```json ... ```) from LLM output."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text)
        text = re.sub(r"```$", "", text)
    return text.strip()
```
It strips any leading or trailing whitespace, checks if the output starts with a markdown code block indicator (` ``` `), and if so, applies a regular expression to strip out ` ```json ` (or ` ``` `) from the beginning and ` ``` ` from the end of the text.

## Things To Know Before Editing

- **Legacy Retention:** The comment on Line 2 clearly states: `Roast feature removed. This module is a stub retained for future services.` Do not delete this file without checking imports in secondary modules, as it prevents import errors during system building.
- **Redundancy:** Modern features in the codebase utilize `_strip_code_fences` located inside `llm_client.py`. If you are building a new service, import and use the helper in `llm_client.py` instead of expanding `clean_llm_answer`.
