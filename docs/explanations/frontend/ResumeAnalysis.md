# ResumeAnalysis.tsx

**Location:** `prsnl/FRONTEND/src/pages/ResumeAnalysis.tsx`  
**Type:** Authenticated Page

## What This File Does

An IDE-like layout for resume analysis with three panels: a sidebar (file upload, job description input, action buttons), a canvas (PDF preview or text editor), and an analysis panel (tabbed results for ATS Score, Deep Analysis, and Hiring Intel). Handles the full workflow from upload through analysis with credit checks and optimistic deductions.

## How It Fits Into The System

- **Triggers:** Rendered at `/resume-analysis` route; requires authentication
- **Dependencies:** `api.ts` (upload, ATS, deep analysis, hiring intel), `CreditContext` (canUse, deductLocal), `DeepAnalysisPanel`, `HiringIntelPanel`, PDF rendering
- **Dependents:** None — leaf page component

## Code Breakdown

### Three-Panel Layout

```
┌──────────┬────────────────────┬──────────────┐
│ Sidebar  │      Canvas        │   Analysis   │
│          │                    │    Panel     │
│ - Upload │ - PDF Preview      │ - ATS Tab    │
│ - JD     │ - Text Editor      │ - Deep Tab   │
│ - Actions│                    │ - Intel Tab  │
└──────────┴────────────────────┴──────────────┘
```

### Sidebar

- **File Upload:** Drag-and-drop zone + file picker. Accepts PDF files. Calls `apiUploadResume` on selection.
- **Job Description Input:** Textarea for pasting the target job description. Required for ATS scoring and hiring intel.
- **Action Buttons:** "Run ATS Score", "Deep Analysis", "Hiring Intel" — each checks credits before executing.

### Canvas (Center Panel)

Displays the uploaded resume:
- **PDF mode:** Renders PDF pages using a PDF viewer component
- **Text mode:** Shows extracted text in an editable textarea (for resumes parsed as text)

Supports drag-and-drop directly onto the canvas area.

### Analysis Panel (Right)

Tabbed interface with three tabs:
1. **ATS Score** — Circular gauge (0-100), keyword matches, missing keywords, section-by-section breakdown
2. **Deep Analysis** — Renders `DeepAnalysisPanel` component with full analysis results
3. **Hiring Intel** — Renders `HiringIntelPanel` component with recruiter perspective

### Credit Flow

For each analysis action:
1. Check `canUse(feature)` — if false, show `InsufficientCreditsWarning`
2. Call `deductLocal(feature)` — optimistic UI update (balance drops immediately)
3. Start a slow-load timer for Hiring Intel (45s — see below)
4. Call the API endpoint — actual server-side deduction happens here
5. On AI failure, backend calls `refund_feature_credits()` and returns HTTP 502 — credits are restored server-side
6. `refreshCredits()` in the `finally` block re-fetches the authoritative balance

**Hiring Intel slow-load warning:** Because Hiring Intel can take 30–60s on Render free-tier, a `setTimeout` of 45 seconds sets `intelSlowWarning = true` while loading. This renders an amber message below the button: "⏳ Still working — Hiring Intel is thorough (30–60s). Hang tight…". The timer is always cleared (`clearTimeout`) in the `finally` block.

### File Upload Flow

1. User drops/selects PDF
2. `apiUploadResume(file)` sends to backend
3. Backend returns resume ID and extracted text
4. Canvas updates to show PDF preview
5. Resume appears in sidebar list for re-selection

## Things To Know Before Editing

- The three-panel layout uses CSS Grid — responsive behavior collapses panels on mobile
- PDF preview may use an iframe or a library like `react-pdf` — check the actual import
- Credit checks happen client-side for UX, but the backend also validates — double protection
- Job description is required for Hiring Intel but optional for ATS and Deep Analysis
- Drag-and-drop uses native HTML5 drag events with `preventDefault` to avoid browser opening the file
- Large PDFs may cause performance issues in the preview — consider pagination
- The analysis panel tabs maintain their content when switching (not unmounted) to preserve scroll position
- **`intelSlowWarning` state:** Controlled by a 45s `setTimeout` in `handleHiringIntel`. Always clear with `clearTimeout` in the `finally` block. Do not convert this to a `useEffect` — it must be scoped to the async call, not the component lifecycle
- **Backend refunds on AI failure:** If the Groq call fails, the backend refunds credits via `refund_feature_credits()`. The frontend then gets the corrected balance from `refreshCredits()`. Do not add any client-side "reverse deduction" logic — it's not needed

*Last updated: Sep 6, 2026 — added `intelSlowWarning` UX, updated credit flow to reflect backend refund on failure*
