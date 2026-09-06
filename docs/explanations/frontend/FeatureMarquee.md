# FeatureMarquee.tsx

**Location:** `prsnl/FRONTEND/src/components/sections/FeatureMarquee.tsx`  
**Type:** Frontend Layout Component (Continuous Scrolling Feature Banner)

## What This File Does

This component renders a continuous, infinite horizontal scrolling marquee showcasing various product features and technical modules (e.g. Resume Analysis, ATS Scoring, AI Mock Interviews, Career Roadmaps). It uses CSS-driven transitions to achieve a smooth sliding motion across the screen, presenting a dynamic and interactive summary of the platform's capabilities.

## How It Fits Into The System

- **What triggers it:** Mounted on the main `/` landing page path (`Index.tsx`) below the primary Hero fold to act as a visual divider.
- **What it depends on:**
  - `lucide-react` — provides standard icons (`FileText`, `Target`, `MessageSquare`, `TrendingUp`, `Sparkles`).
  - Standard global CSS marquee animations.
- **What depends on it:** Hometown pages mount this component to establish key visual interest and display feature keywords in a compact layout.

## Code Breakdown

### Array Doubling Pattern
**Lines:** 4–19, 26  
Maintains a list of features. To create a seamless, non-breaking loop where elements scroll infinitely without empty space gaps at the ends, the array is **doubled** in the render mapping block:
```typescript
{[...features, ...features].map((feature, index) => ( ... ))}
```
This guarantees that as the first set of items exits the screen, the second identical set enters, making the loop invisible to the viewer.

### Marquee CSS Track
**Lines:** 23–25  
Uses a backing wrapper (`overflow-hidden`) combined with a flex container styled with the `marquee` class. The sliding animation is handled entirely by a custom infinite CSS translation loop defined in the global stylesheet (`index.css`), making it highly performant and responsive on mobile devices:
```css
/* Conceptual CSS behind the .marquee class */
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

## Things To Know Before Editing

- **List Updates:** If you add new feature keywords or swap icons, make sure to add them to the `features` array. Keep labels relatively short to prevent individual badge elements from wrapping or distorting.
- **Performance:** Because this animation runs via CSS translation, it is processed on the GPU and maintains a fluid 60fps. Avoid converting this to JS-based interval trackers, which cause layout thrashing.
