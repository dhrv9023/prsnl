# main.tsx

**Location:** `prsnl/FRONTEND/src/main.tsx`  
**Type:** Application Entry Point

## What This File Does

Bootstraps the entire React application. It optionally initializes Sentry error tracking (only if the `VITE_SENTRY_DSN` environment variable is set), creates the React root DOM node, and renders the top-level `<App />` component into the `#root` element.

## How It Fits Into The System

- **Triggers:** Browser loads `index.html` → Vite serves this as the entry module
- **Dependencies:** `react`, `react-dom`, `@sentry/react` (conditional), `App.tsx`
- **Dependents:** Nothing imports this file — it is the root of the module graph

## Code Breakdown

### Sentry Initialization (Conditional)

Checks for `import.meta.env.VITE_SENTRY_DSN`. If present, calls `Sentry.init()` with the DSN, enabling automatic error reporting in production. If the env var is missing, Sentry is never loaded or initialized — zero overhead in development.

### React Root Creation

Uses `ReactDOM.createRoot()` targeting `document.getElementById('root')`. This is the standard React 18 concurrent-mode entry point.

### App Render

Renders `<App />` inside `<React.StrictMode>` (development double-render checks). The App component handles all routing, providers, and layout from here.

## Things To Know Before Editing

- Sentry initialization must happen **before** `createRoot` to catch errors during initial render
- If you add global providers (e.g., a theme provider that must wrap everything), they go in `App.tsx`, not here
- This file should stay minimal — routing, context, and layout logic belong in `App.tsx`
- The `#root` element is defined in `index.html` at the project root
