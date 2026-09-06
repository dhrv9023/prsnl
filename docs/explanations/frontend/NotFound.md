# NotFound.tsx

**Location:** `prsnl/FRONTEND/src/pages/NotFound.tsx`  
**Type:** React Page Component (404 Fallback page)

## What This File Does

This page provides the fallback display (404 Page Not Found) whenever a user attempts to navigate to a route that does not exist in the React Router config. It displays a clear "404" header, shows the exact non-existent pathname that the user tried to load, and provides a quick link to navigate back to the home page.

## How It Fits Into The System

- **What triggers it:** Rendered automatically by the layout routing router (`react-router-dom`) when no path matches the current address bar.
- **What it depends on:**
  - `react-router-dom` — captures current location path name (`useLocation`) and renders an internal router transition link (`Link`).
- **What depends on it:** App routing declarations use it as a wildcard route catch-all (`path="*"`) at the end of route maps.

## Code Breakdown

### Path Name Resolution
**Lines:** 4, 11–13  
Utilizes React Router's `useLocation` hook to extract the current path string:
```typescript
const location = useLocation();
```
It prints this path dynamically inside a formatted code snippet tag (`{location.pathname}`), making it clear to the user exactly what URL failed to load.

### Layout Styles
**Lines:** 7–21  
Uses standard flex layouts to center the error block (`flex min-h-screen items-center justify-center`). It relies on standard system semantic CSS tokens (`bg-background`, `text-primary`, `text-muted-foreground/60`) to automatically blend with the active theme (light or dark mode) without custom CSS styles.

## Things To Know Before Editing

- **Route Configuration:** In the main routing maps, ensure this component is mapped to the wildcard route (`path="*"`) so it captures all malformed URLs.
- **Dynamic Assets:** If requested, visual enhancements (such as a 404 space/career graphic or micro-animations) can be loaded here, but keep the layout centered and lightweight to prevent loading delays.
