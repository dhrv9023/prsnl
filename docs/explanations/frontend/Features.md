# Features.tsx

**Location:** `prsnl/FRONTEND/src/components/sections/Features.tsx`  
**Type:** Frontend Layout Component (Landing Page "How Kareerist Thinks" Features Grid)

## What This File Does

This component renders the primary features grid of the Kareerist homepage, organized under the title "How Kareerist Thinks." Instead of just listing tools, it frames the platform's features around a core intellectual methodology: **Evaluate**, **Prioritize**, **Direct**, and **Adapt**. It displays these four pillars in a beautiful border-aligned grid, with responsive entrance transitions, custom indicators (such as numbers `01` to `04` in monospace fonts), and interactive background color shifts upon cursor hovering.

## How It Fits Into The System

- **What triggers it:** Mounted on the main `/` landing page path (`Index.tsx`) below the primary Dashboard fold.
- **What it depends on:**
  - `framer-motion` — handles entrance fade-ins for both headers and the individual cells.
  - `lucide-react` — imports graphic icons (`Target`, `Zap`, `ArrowRight`, `RefreshCw`).
- **What depends on it:** Hometown pages mount this component to establish the underlying career progression framework.

## Code Breakdown

### Pillars Data Model
**Lines:** 12–33  
A static array mapping each methodology pillar:
- **01 Evaluate:** Explains how the platform scores resumes against objective hiring standards.
- **02 Prioritize:** Explains how the system highlights only critical tasks.
- **03 Direct:** Explains how it maps out clear next actions.
- **04 Adapt:** Outlines how the system dynamically recalibrates recommendations as user inputs change.

### Border-Aligned Visual Grid Layout
**Lines:** 60, 67  
Renders an elegant table-like grid using Tailwind CSS custom borders:
```html
<div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-border/20">
```
Each cell renders with `border-r border-b border-border/20`. When combined, this creates a clean grid where grid lines perfectly overlap without double-width borders. Hovering over a card triggers a smooth transition (`hover:bg-secondary/20 transition-colors duration-500`) to highlight active elements.

### Header & Staggered Cell Entrances
**Lines:** 42–46, 61–68  
Utilizes `useInView` to detect visibility. Staggers cell entry animations using a delay formula based on the card's array index (`delay: index * 0.1`) alongside standard easing curves (`easeOut`), producing a polished entrance transition.

## Things To Know Before Editing

- **Adding New Pillars:** If expanding the list of pillars beyond 4, make sure the grid column class is adjusted appropriately (currently optimized for a balanced 2-column grid on desktop screens).
- **Icon stroke size:** The Lucide icons use `stroke-[1.5]` to keep stroke paths clean and premium, matching the Outfit typeface aesthetics. Keep this consistent for any replacement icons.
