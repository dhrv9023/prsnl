# RoastModeContext.tsx

**Location:** `prsnl/FRONTEND/src/contexts/RoastModeContext.tsx`  
**Type:** React Context (Deprecated Stub)

## What This File Does

A no-op stub that provides a roast mode context always returning `false`. Roast mode (a feature that gave brutally honest feedback) has been removed from the UI, but this context file is retained to prevent import errors from any remaining references.

## How It Fits Into The System

- **Triggers:** May still be imported by components that haven't been cleaned up
- **Dependencies:** React Context API only
- **Dependents:** Potentially stale imports in AIInterview, CoverLetter, or analysis components

## Code Breakdown

### Provider

Renders children with a static context value:
```typescript
{
  isRoastMode: false,
  toggleRoastMode: () => {} // no-op
}
```

No state, no effects, no side effects.

### Hook

`useRoastMode()` returns the static context value. Any component reading `isRoastMode` will always get `false`.

## Things To Know Before Editing

- This file is safe to delete once all imports referencing it are removed
- Search the codebase for `useRoastMode` and `RoastModeContext` before deleting
- The feature was removed for product reasons — the "roast" tone wasn't well-received in user testing
- If roast mode is ever re-introduced, this stub can be replaced with real state management
