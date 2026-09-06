# HinglishToggle.tsx

**Location:** `prsnl/FRONTEND/src/components/ui/HinglishToggle.tsx`  
**Type:** UI Component

## What This File Does

A toggle button that converts English text to Hinglish (Hindi-English code-mixed language) via a backend API call. Shows loading state during conversion, error state on failure, and a revert button to restore the original text. Calls an `onConverted` callback with the converted or reverted text.

## How It Fits Into The System

- **Triggers:** Used in Dashboard (analysis summaries), AIInterview (questions/feedback), ResumeAnalysis (analysis results)
- **Dependencies:** Backend API endpoint `/api/v1/utils/hinglish`
- **Dependents:** DeepAnalysisPanel, HiringIntelPanel, AIInterview InterviewStep/ReportStep

## Code Breakdown

### Props

```typescript
interface HinglishToggleProps {
  text: string;           // Original English text to convert
  onConverted: (text: string) => void;  // Callback with converted/reverted text
  className?: string;     // Optional styling
}
```

### States

- **Idle:** Shows "🇮🇳 Hinglish" button
- **Loading:** Shows spinner, button disabled
- **Converted:** Shows "↩ Revert" button (text has been converted)
- **Error:** Shows error message briefly, reverts to idle

### Conversion Flow

1. User clicks "Hinglish" button
2. Sets loading state
3. Calls `POST /api/v1/utils/hinglish` with `{ text }` body
4. On success: stores original text, calls `onConverted(convertedText)`, switches to "Revert" state
5. On error: shows brief error toast/message, stays in idle state

### Revert Flow

1. User clicks "Revert" button
2. Calls `onConverted(originalText)` with the stored original
3. Switches back to idle state (ready to convert again)

### Original Text Storage

The component stores the original English text internally (via `useRef` or state) so it can revert without re-fetching. This means:
- No extra API call on revert
- Works even if the parent re-renders with different props (original is captured at conversion time)

## Things To Know Before Editing

- The Hinglish API endpoint is a utility endpoint — it doesn't cost credits (verify this)
- The component is stateful — it tracks whether text is currently in Hinglish or English
- If the parent's `text` prop changes (new analysis result), the component should reset to idle state
- The conversion is not cached — converting the same text twice makes two API calls
- Hinglish conversion quality depends on the backend AI model — some technical terms may not translate well
- The 🇮🇳 flag emoji may render differently across platforms — consider using an SVG icon instead
