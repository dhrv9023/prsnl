# models.md

**Location:** `prsnl/backend/app/schemas/models.py`  
**Type:** Pydantic Models

## What This File Does

Defines all request and response Pydantic models used across the backend API. These models handle input validation, type coercion, and output serialization for every endpoint. They enforce constraints like score clamping, type normalization, and required field validation — ensuring that invalid data never reaches the service layer and that API responses have a consistent, predictable shape.

## How It Fits Into The System

- **Triggered by:** Every API endpoint uses these models for request parsing and response serialization
- **Dependencies:** Pydantic v2 (BaseModel, Field, validator/field_validator)
- **Dependents:** All route handlers, all service functions, frontend API client (expects these exact response shapes)

## Code Breakdown

### Request Models

#### MatchRequest
- Used for basic resume-JD matching
- Fields: `resume_text`, `job_description`

#### DeepAnalysisRequest
- Used for the deep analysis endpoint
- Fields: `resume_text`, `job_description` (optional — analysis works without JD but is enhanced with one)

#### HiringIntelRequest
- Used for hiring intelligence reports
- Fields: `resume_text`, `job_description`

#### CoverLetterRequest
- Used for professional cover letter generation
- Fields: `resume_text`, `job_description`, `company_name` (optional), `job_title` (optional)

#### CoverLetterRoastRequest
- Used for roast-mode cover letter generation
- Fields: same as `CoverLetterRequest` plus `language` (optional, for Hinglish/other language support)

#### HumanizeRequest
- Used for the humanizer endpoint
- Fields: `text` (the AI-generated cover letter to humanize)

#### SavePDFRequest
- Used for PDF export functionality
- Fields: `content`, `filename` (optional)

### Interview Models

#### StartInterviewRequest
- Initiates a new interview session
- Fields: `resume_text`, `job_description`, `experience_level`, `mode` (normal/roast)

#### AnswerSubmission
- Submits an answer for evaluation
- Fields: `session_id`, `question_index`, `answer`

#### InterviewQuestion
- Represents a single interview question
- Fields: `type` (theory/mcq/code), `question`, `options` (for MCQ), `difficulty`
- **Type validator**: normalizes the `type` field to lowercase — if the LLM returns "Theory" or "THEORY", it becomes "theory"

#### AnswerEvaluation
- Represents the evaluation of a single answer
- Fields: `score` (0-10), `feedback`, `ideal_answer`
- **Score clamping**: a validator ensures `score` is always within 0-10; values below 0 become 0, values above 10 become 10

#### InterviewReport
- Complete interview session results
- Fields: `questions` (list of InterviewQuestion), `evaluations` (list of AnswerEvaluation), `overall_score`, `summary`

#### InterviewSession
- Tracks an active interview session
- Fields: `session_id`, `questions`, `current_index`, `evaluations`

### Key Validators

#### InterviewQuestion.type Normalization
```python
@field_validator('type')
def normalize_type(cls, v):
    return v.lower()
```
Ensures consistent type values regardless of LLM output casing.

#### AnswerEvaluation.score Clamping
```python
@field_validator('score')
def clamp_score(cls, v):
    return max(0, min(10, v))
```
Prevents invalid scores from propagating — the LLM might return 11 or -1, but the API always returns 0-10.

## Things To Know Before Editing

- Changing field names in response models is a **breaking API change** — the frontend expects exact field names; coordinate with frontend changes
- The `InterviewQuestion.type` validator means you can never have a type that relies on casing — "MCQ" and "mcq" are the same after normalization
- Score clamping is silent — there's no warning when a score is clamped; if you need to detect LLM misbehavior, add logging before the clamp
- Optional fields (like `company_name` in `CoverLetterRequest`) default to `None` — service functions must handle the `None` case
- `SavePDFRequest` is the only model not tied to an AI service — it's for the PDF export utility
- If you add a new endpoint, create its request/response models here to maintain the single-source-of-truth pattern
- Pydantic v2 syntax is used (`field_validator` with `@classmethod` style) — don't mix v1 `@validator` syntax
