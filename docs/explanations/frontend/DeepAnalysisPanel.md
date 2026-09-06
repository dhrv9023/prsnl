# DeepAnalysisPanel.tsx

**Location:** `prsnl/FRONTEND/src/components/analysis/DeepAnalysisPanel.tsx`  
**Type:** UI Component

## What This File Does

Renders the full deep analysis results for a resume. Displays a header card with overall grade and summary (with Hinglish toggle), collapsible section breakdowns (each showing score, feedback, issues, and missing keywords), and a prioritized list of action items the user should take to improve their resume.

## How It Fits Into The System

- **Triggers:** Rendered inside ResumeAnalysis page's "Deep Analysis" tab when results are available
- **Dependencies:** `HinglishToggle` component, analysis response data (passed as props)
- **Dependents:** ResumeAnalysis page

## Code Breakdown

### Props

Receives the deep analysis response object containing:
- `overallGrade` — letter grade (A, B+, C, etc.)
- `summary` — text overview of the resume's quality
- `sections` — array of section breakdowns
- `actionItems` — prioritized improvement suggestions

### Header Card

- **Grade Badge:** Large colored badge showing the letter grade (A = green, B = blue, C = amber, D/F = red)
- **Summary Text:** 2-3 sentence overview of the resume's strengths and weaknesses
- **Hinglish Toggle:** Converts the summary text to Hinglish for Hindi-speaking users

### Section Breakdown (Collapsible)

Each resume section (Experience, Education, Skills, Projects, etc.) gets a collapsible card:

**Collapsed view:**
- Section name
- Score pill (colored: green >80, amber >60, red <60)
- Brief one-line feedback

**Expanded view:**
- Full feedback paragraph
- **Issues List:** Specific problems found (e.g., "No quantified achievements in bullet 3")
- **Missing Keywords:** Keywords that should be present for the target role but aren't found in this section

Sections are sorted by score (worst first) to prioritize what needs attention.

### Action Items List

Numbered list of concrete improvements, prioritized by impact:
1. High-impact items first (things that would significantly improve ATS score)
2. Medium-impact items
3. Nice-to-have improvements

Each item has:
- Priority indicator (🔴 high, 🟡 medium, 🟢 low)
- Clear, actionable instruction
- Which section it applies to

## Things To Know Before Editing

- This component is purely presentational — it receives data as props and renders it. No API calls.
- The collapsible sections use local state (each independently expandable)
- Grade-to-color mapping should be defined as a constant/utility for reuse
- The Hinglish toggle only applies to the summary text, not individual section feedback (to keep API calls minimal)
- If the analysis response shape changes on the backend, update the TypeScript interface in `api.ts` AND the rendering logic here
- Long section feedback may need text truncation with "show more" in collapsed state
- Missing keywords are displayed as pills/tags for easy scanning
