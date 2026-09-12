# ai_interview.md

**Location:** `prsnl/backend/app/services/ai_interview.py`  
**Type:** AI Service

## What This File Does

Powers the AI mock interview system with four main functions: generating interview questions tailored to a candidate's resume, evaluating individual answers with scoring and feedback, and roast-mode variants of both that use a savage interviewer persona. Questions are calibrated to the candidate's experience level and target their weak spots using analysis context from prior resume analysis. Each session produces 6 questions with progressive difficulty across theory, MCQ, and coding categories.

## How It Fits Into The System

- **Triggered by:** The `/interview/start` and `/interview/answer` API endpoints
- **Dependencies:** Groq API client via `chat_complete` (`groq/compound-mini` primary, `groq/compound` fallback — both free on GroqCloud), `sanitize_user_text`, `with_ai_retry`, resume analysis context (from deep_analysis or hiring_intel)
- **Dependents:** The AI Interview page in the frontend (`AIInterview.tsx`), which manages the interview session flow, displays questions, and shows evaluation results

## Code Breakdown

### LEVEL_GUIDELINES Dictionary

A configuration dict that maps experience levels to difficulty calibration:
- **Fresher** — foundational concepts, basic syntax, simple problem-solving
- **Junior** — applied knowledge, common patterns, debugging scenarios
- **Mid** — system design basics, optimization, trade-off discussions
- **Senior** — architecture decisions, scalability, leadership scenarios, production war stories

Each level defines expected depth, complexity of code questions, and what "good" vs "great" answers look like. This dict is injected into the system prompt to calibrate question difficulty.

### generate_questions

- Produces exactly **6 questions** per session:
  - 2 theory questions (conceptual understanding)
  - 2 MCQ questions (multiple choice with 4 options)
  - 2 code questions (write/debug/optimize code)
- Progressive difficulty: questions get harder as the session progresses
- **Resume-specific**: uses the candidate's actual skills, projects, and experience to craft relevant questions
- **Analysis context**: leverages weak spots identified in prior resume analysis to target areas where the candidate needs improvement
- **Random variation hints**: injects randomness seeds into the prompt to ensure fresh questions across sessions (prevents the same user from getting identical questions)
- Validates that returned questions match the expected type distribution (2/2/2)

### evaluate_single_answer

- Scores each answer on a 0-10 scale
- Provides detailed feedback explaining why the score was given
- Highlights what was good, what was missing, and what the ideal answer would include
- **Score clamping**: ensures the score is always within 0-10 (prevents model from returning 11/10 or negative scores)
- Returns an `AnswerEvaluation` Pydantic model

### generate_roast_questions (Roast Mode)

- Same structure as `generate_questions` but with a savage interviewer persona
- Questions are phrased provocatively ("So you claim to know React...")
- Still technically valid interview questions — the roast is in the framing, not the content
- Uses the same LEVEL_GUIDELINES for difficulty calibration

### evaluate_roast_answer (Roast Mode)

- Scores the same way (0-10) but feedback is delivered with brutal honesty
- Bad answers get roasted; good answers get grudging respect
- Still provides actionable feedback underneath the humor

### Question Type Validation

After generation, each question's `type` field is validated against the expected set (`theory`, `mcq`, `code`). If the model returns an unexpected type, it's normalized or the question is regenerated.

## Things To Know Before Editing

- The 2/2/2 question distribution (theory/MCQ/code) is hardcoded in the prompt and validated post-generation — changing it requires updating both the prompt and the validation logic
- Score clamping to 0-10 happens at the Pydantic model level (`AnswerEvaluation`) — the model might return scores outside this range, and they'll be silently clamped
- Random variation hints are critical for preventing question repetition — removing them will cause users to get the same questions across sessions
- `analysis_context` is optional but significantly improves question relevance — without it, questions are generic to the candidate's listed skills rather than targeting specific weaknesses
- The LEVEL_GUIDELINES dict must be kept in sync with the experience level options offered in the frontend's `StartInterviewRequest`
- Roast mode questions must still be valid interview questions — the persona is savage but the content must be technically sound and answerable
- Progressive difficulty means question ordering matters — don't shuffle the output array
