# ValueNarrative.tsx

**Location:** `prsnl/FRONTEND/src/components/sections/ValueNarrative.tsx`  
**Type:** Frontend Layout Component (Landing Page Value Narrative / Principles)

## What This File Does

This component presents a premium, large-type philosophical section titled "Careers aren’t built with tools." It introduces four core platform principles (Signal Over Noise, Structure Over Chaos, Clarity Over Guesswork, Progress Over Activity) that explain the "why" behind the product. The layout is optimized for high readability, featuring fine line grids, large text hierarchies, and sequential entry animation timers.

## How It Fits Into The System

- **What triggers it:** Mounted on the main `/` landing page path (`Index.tsx`) below the Features block.
- **What it depends on:**
  - `framer-motion` — coordinates scroll-triggered entrance translations.
- **What depends on it:** Main pages import this section to bridge the gap between simple product feature grids and final CTAs.

## Code Breakdown

### Philosophical Principles List
**Lines:** 5–22  
Maintains a static array containing:
- **01 Signal Over Noise:** Emphasizing relevance in analytics.
- **02 Structure Over Chaos:** Highlighting cohesive learning frameworks.
- **03 Clarity Over Guesswork:** Targeting mitigation of user stress.
- **04 Progress Over Activity:** Prioritizing impact metrics over sheer work volume.

### Clean Monochromatic Grid Layout
**Lines:** 48–56  
Arranges the four items in a single horizontal row on large desktop monitors:
```html
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-border/20">
```
Cells include bottom borders (`border-b`) on mobile, which switch to vertical right dividers (`md:border-r`) on wider viewports. Cells feature an elegant hover background transition (`hover:bg-secondary/10 transition-colors duration-500`) to increase interactivity.

### Framer Motion Parameters
**Lines:** 31–35, 50–54  
Uses `useInView` to run container elements synchronously:
- Headline fades in using `y: 40` translate shifts.
- Principles load sequentially with staggered delays (`0.2 + index * 0.1`) to guide the viewer's reading flow naturally from left to right.

## Things To Know Before Editing

- **Responsive Scaling:** Note the large font sizing on the primary headers (`text-5xl md:text-7xl`). Keep line lengths short to prevent awkward wrapping on narrower tablet displays.
- **Color Contrast:** The text uses `text-muted-foreground/70` by default, transitioning to `text-muted-foreground` when hovered. Ensure any global color variables keep this grid clean and readable in both light and dark modes.
