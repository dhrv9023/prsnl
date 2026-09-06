# use-toast.ts

**Location:** `prsnl/FRONTEND/src/hooks/use-toast.ts`  
**Type:** Custom React Hook & State Manager (Toast notification system)

## What This File Does

This file implements a robust, lightweight, and central toast notification state engine. It manages a queue of active alert messages, coordinates their screen presentation, sets layout restrictions (limiting the maximum displayed notifications at once), and exposes standard functions to trigger, update, dismiss, and clean up notification dialog boxes anywhere in the application.

## How It Fits Into The System

- **What triggers it:** Any React component (such as forms, dashboards, or auth containers) imports `useToast` or the standalone `toast` trigger to display non-blocking alerts (e.g. credit updates, success messages, network failures).
- **What it depends on:**
  - `@/components/ui/toast` — imports properties and layout definitions.
- **What depends on it:**
  - `@/components/ui/toaster` — mounts the component and subscribes to the hook state to render active toast UI nodes.
  - App pages throughout the platform.

## Code Breakdown

### Toast Constraints
**Lines:** 5–6  
- `TOAST_LIMIT = 1` — ensures that only **one toast** is visible at a time to prevent UI clutter. New notifications immediately push older ones off the stack.
- `TOAST_REMOVE_DELAY = 1000000` — sets a long lifespan on the underlying memory queue before the items are hard-removed from storage.

### Action State Reducer
**Lines:** 15–20, 71–122  
Uses a standard action-type state reducer pattern (`reducer(state, action)`) to handle:
- `ADD_TOAST`: Prepends the new toast and slices the list to obey `TOAST_LIMIT`.
- `UPDATE_TOAST`: Allows updating an active toast (e.g. converting a loading indicator to a success check).
- `DISMISS_TOAST`: Changes the `open` status of a toast to `false` and triggers the removal delay timer.
- `REMOVE_TOAST`: Filters the target toast out of the state array entirely.

### Broadcaster Queue & State Synchronization
**Lines:** 124–133, 166–184  
Because React state hooks are local to instances, this hook uses an **external memory state object** (`memoryState`) and a global list of callback functions (`listeners`):
```typescript
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}
```
When `useToast` mounts, it registers its state setter (`setState`) into the `listeners` array. When any dispatch fires, the hook updates the external memory and notifies all registered instances, allowing components to trigger notifications even outside the React rendering hierarchy.

## Things To Know Before Editing

- **Shadcn standard:** This is a standard Shadcn UI notification utility. If you update the `@/components/ui/toast` visual markup, this hook will remain fully compatible without adjustments.
- **Timeout parameters:** The `TOAST_REMOVE_DELAY` is deliberately set high because the physical dismiss slide-out transitions are handled by CSS animations on the frontend.
