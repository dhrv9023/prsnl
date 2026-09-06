# CoverLetter.tsx

**Location:** `prsnl/FRONTEND/src/pages/CoverLetter.tsx`  
**Type:** Authenticated Page

## What This File Does

A two-column layout for generating and editing cover letters. The sidebar handles input (resume selection, job details), and the main area displays the generated cover letter in an editable textarea with actions to humanize the text, download as plain text, or download as PDF. Uses jsPDF for client-side PDF generation.

## How It Fits Into The System

- **Triggers:** Rendered at `/cover-letter` route; requires authentication
- **Dependencies:** `api.ts` (apiGenerateCoverLetter, apiListResumes), `CreditContext`, `jsPDF` library
- **Dependents:** None — leaf page component

## Code Breakdown

### Two-Column Layout

```
┌──────────────┬─────────────────────────────┐
│   Sidebar    │        Main Area            │
│              │                             │
│ - Resume     │  - Editable textarea        │
│   selector   │  - Action bar:              │
│ - Job title  │    [Humanize] [TXT] [PDF]   │
│ - Company    │                             │
│ - JD paste   │                             │
│ - Generate   │                             │
└──────────────┴─────────────────────────────┘
```

### Sidebar Inputs

- **Resume Selector:** Dropdown populated from `apiListResumes()`. Selects which resume to base the cover letter on.
- **Job Title:** Text input for the target position
- **Company Name:** Text input for the target company
- **Job Description:** Textarea for pasting the full JD
- **Generate Button:** Triggers generation with credit check

### Generation Flow

1. Validate inputs (resume selected, job details filled)
2. Check `canUse('cover_letter')` — show warning if insufficient
3. Call `deductLocal('cover_letter')` for optimistic UI
4. Call `apiGenerateCoverLetter({ resumeId, jobTitle, company, jobDescription })`
5. Set the returned text into the editable textarea
6. On error, `refresh()` credits to undo optimistic deduction

### Editable Output

The generated cover letter appears in a large textarea that the user can freely edit. Changes are local only — there's no auto-save to the backend.

### Action Bar

- **Humanize:** Sends the current text through an AI endpoint to make it sound less AI-generated (more natural phrasing, varied sentence structure)
- **Download TXT:** Creates a Blob from the textarea content and triggers a download
- **Download PDF:** Uses `jsPDF` to generate a formatted PDF client-side with proper margins, font size, and line wrapping

### Roast Mode (Disabled)

The roast mode toggle exists in the code but is currently hidden/disabled in the UI. When active, it would generate a brutally honest cover letter critique instead of a polished letter.

## Things To Know Before Editing

- PDF generation is entirely client-side via jsPDF — no backend call needed for download
- The textarea is uncontrolled after generation (user edits don't trigger re-renders) — be careful with state management
- jsPDF has limited font support — special characters or non-Latin scripts may not render correctly in PDFs
- The "humanize" feature costs additional credits — it's a separate API call
- Resume list is fetched on mount — if the user uploads a new resume on another tab, they need to refresh
- Long cover letters may need pagination in the PDF output — check jsPDF's `splitTextToSize` usage
