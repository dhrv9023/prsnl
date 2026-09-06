# InterviewHistory.tsx

**Location:** `prsnl/FRONTEND/src/pages/InterviewHistory.tsx`  
**Type:** Authenticated Page

## What This File Does

Displays a history of past interview sessions as expandable cards. Each card shows the session's score, target role, timestamp, and can be expanded to reveal a full question-by-question breakdown with answers, feedback, and ideal responses. Includes a stats row summarizing overall interview performance.

## How It Fits Into The System

- **Triggers:** Rendered at `/interview/history` route; requires authentication
- **Dependencies:** `api.ts` (apiInterviewHistory), `useAuthContext`
- **Dependents:** None — leaf page component. Linked from Dashboard and AIInterview report step.

## Code Breakdown

### Stats Row

Summary cards at the top showing:
- **Total Sessions:** Count of all completed interviews
- **Average Score:** Mean score across all sessions
- **Best Score:** Highest score achieved

Calculated client-side from the fetched history data.

### Session Cards

Each past interview renders as a card showing:
- Overall score (with color coding: green >80, amber >60, red <60)
- Target role (e.g., "Senior Frontend Engineer")
- Experience level selected
- Timestamp (relative: "3 days ago")
- Expand/collapse toggle

### Expanded Breakdown

When a card is expanded, shows each question from that session:

**Breakdown Row (collapsed):**
- Question number
- Brief question text (truncated)
- Score for that question

**Breakdown Row (expanded):**
- Full question text
- User's submitted answer
- AI feedback on the answer
- Ideal/model answer
- For code questions: complexity info (time/space complexity, approach)

### Data Fetching

- Calls `apiInterviewHistory()` on mount
- Shows skeleton loaders while fetching
- Empty state message if no interviews yet ("Start your first interview!")
- Error state with retry button

## Things To Know Before Editing

- The history endpoint returns all sessions — if this grows large, pagination will be needed
- Expanded state is per-card and per-breakdown-row (nested expand/collapse)
- Score color thresholds should match those used in the AIInterview report step for consistency
- Code question complexity info is optional — not all questions have it (only coding questions)
- The stats row recalculates on every render from the data array — memoize if performance becomes an issue
- This page is read-only — no mutations or credit costs
