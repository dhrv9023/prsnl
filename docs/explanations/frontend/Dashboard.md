# Dashboard.md (Section Component)

**Location:** `prsnl/FRONTEND/src/components/sections/Dashboard.tsx`  
**Type:** Frontend Layout Component (Interactive Homepage Dashboard Preview)

## What This File Does

This component displays a mock "Command Center" dashboard preview to showcase the platform's key features to unauthenticated landing page visitors. It displays a real-time status card showing an active career telemetry model, a glowing highlight panel offering automated career insights, three diagnostic metrics boards (Resume Score, Interview Readiness, and Path Progress) with animated bars, and an interactive prioritized task queue called the "Priority Stack."

## How It Fits Into The System

- **What triggers it:** Rendered as the secondary feature showcase section on the main `/` landing page path (`Index.tsx`).
- **What it depends on:**
  - `framer-motion` — animates progress meters and overall containers as they enter the screen.
  - `lucide-react` — provides status and category icons (`Activity`, `Zap`, `Clock`, etc.).
- **What depends on it:** Hometown pages mount this component below the Hero fold to give visitors a clear understanding of the active, data-driven workspace.

## Code Breakdown

### Subscribed Telemetry Status
**Lines:** 48–55  
Displays a mock "Career Model Active" state. It incorporates a CSS-animated pulsing indicator dot using standard Tailwind utility classes:
```typescript
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
</span>
```

### System Insight Highlights
**Lines:** 57–90  
Renders a highlighted insight card illustrating automated recommendations:
- Emphasizes a high-impact task: `Improving experience section` raises score by `+8-12 points`.
- Uses a relative absolute glow overlay (`shadow-[0_0_50px_-20px_rgba(var(--accent-rgb),0.15)]`) to draw user focus to the recommendation.

### Staggered Progress Indicators
**Lines:** 96–188  
Provides three diagnostic score widgets. Uses Framer Motion properties to expand the progress bars from `0%` to their target levels (`87%`, `72%`, `66%`) once they are scrolled into the viewport:
```typescript
initial={{ width: 0 }}
animate={isInView ? { width: "87%" } : {}}
transition={{ duration: 1.5, ease: "easeOut" }}
```

### Prioritized Task Queue ("Priority Stack")
**Lines:** 199–290  
Implements an elegant timeline view mapping actions categorized by potential impact:
- **High Impact (Critical - Red):** Connects a pulsing red indicator with action items (+8 score).
- **Medium (Yellow):** Connects secondary goals (e.g. Completing mock interviews).
- **Optimization (Green):** Outlines quick structural clean-up targets.

## Things To Know Before Editing

- **Dynamic Data Hooking:** This is a **static presentation preview** showing placeholder analytics. If you want to wire it to display actual active user stats, pull database metrics from authenticated context models and replace the hardcoded values (such as `87`, `72`, and the Priority Stack array lists) with mapped dynamic values.
- **Scroll Margin:** The `useInView` hook features a `-100px` bottom margin, which prevents indicators from animating until the user has scrolled significantly past the top fold.
