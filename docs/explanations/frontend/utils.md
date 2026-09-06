# utils.ts

**Location:** `prsnl/FRONTEND/src/lib/utils.ts`  
**Type:** Utility

## What This File Does

Exports a single utility function `cn()` that merges Tailwind CSS class names intelligently. It combines `clsx` (conditional class joining) with `tailwind-merge` (deduplication of conflicting Tailwind classes). This is the standard utility included in every shadcn/ui project.

## How It Fits Into The System

- **Triggers:** Called by virtually every component that accepts a `className` prop
- **Dependencies:** `clsx`, `tailwind-merge`
- **Dependents:** All UI components, layout components, page components

## Code Breakdown

### cn(...inputs) Function

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**What it solves:**

Without `tailwind-merge`, combining classes like `cn("px-4", "px-6")` would produce `"px-4 px-6"` — both applied, last wins (fragile). With `twMerge`, the output is `"px-6"` — the conflict is resolved deterministically.

`clsx` handles the conditional logic:
```typescript
cn("base", isActive && "bg-blue-500", isDisabled && "opacity-50")
// → "base bg-blue-500" (if active and not disabled)
```

## Things To Know Before Editing

- Don't add unrelated utilities here — this file is intentionally single-purpose per shadcn/ui convention
- If you need more utilities, create separate files in `src/lib/`
- Every shadcn/ui component imports from this path — changing the export name or path breaks everything
- The function is variadic — you can pass any number of arguments, arrays, objects, or falsy values
