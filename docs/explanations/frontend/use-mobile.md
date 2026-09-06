# use-mobile.tsx

**Location:** `prsnl/FRONTEND/src/hooks/use-mobile.tsx`  
**Type:** React Hook

## What This File Does

A simple responsive hook that returns a boolean indicating whether the viewport width is below 768px (mobile breakpoint). Uses the browser's `matchMedia` API with an event listener for real-time updates when the window is resized or device orientation changes.

## How It Fits Into The System

- **Triggers:** Used by components that need to render differently on mobile vs desktop
- **Dependencies:** Browser `window.matchMedia` API
- **Dependents:** Navbar (mobile menu toggle), layout components, any component with responsive behavior

## Code Breakdown

### Implementation

```typescript
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches); // initial check
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
```

- Creates a `MediaQueryList` for `max-width: 767px`
- Listens for changes (resize, orientation)
- Cleans up listener on unmount
- Returns current match state

## Things To Know Before Editing

- The 768px breakpoint matches Tailwind's `md:` breakpoint — keep them in sync
- `matchMedia` is more performant than a `resize` event listener (browser optimizes media query evaluation)
- Initial state is `false` (desktop) — on SSR or first render, components assume desktop until the effect runs
- This is a standard shadcn/ui hook — if you need a different breakpoint, create a separate hook rather than modifying this one
