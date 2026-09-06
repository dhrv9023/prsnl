# Index.tsx

**Location:** `prsnl/FRONTEND/src/pages/Index.tsx`  
**Type:** Landing Page

## What This File Does

Composes the public marketing landing page from a series of section components. This is the first thing visitors see at the root URL (`/`). No authentication is required. The page is designed to communicate the product's value proposition and drive signups.

## How It Fits Into The System

- **Triggers:** Rendered when the user navigates to `/`
- **Dependencies:** Section components (Navbar, Hero, FeatureMarquee, Features, Dashboard, ValueNarrative, FinalCTA, Footer)
- **Dependents:** None — this is a leaf page component

## Code Breakdown

### Component Composition

The page is a vertical stack of section components, each responsible for its own layout and content:

```tsx
<>
  <Navbar />
  <Hero />
  <FeatureMarquee />
  <Features />
  <Dashboard />        {/* Preview/screenshot section */}
  <ValueNarrative />
  <FinalCTA />
  <Footer />
</>
```

Each section is a self-contained component in `src/components/sections/` (except Navbar and Footer which are in `src/components/layout/`).

### No State, No Effects

This component has no local state, no API calls, and no side effects. It's purely compositional — arranging sections in order. All interactivity (auth modals, navigation) is handled within the individual section components.

## Things To Know Before Editing

- To reorder landing page sections, just reorder the components here
- To add a new section, create it in `src/components/sections/` and add it to this composition
- The Navbar and Footer are shared with other pages — changes there affect the whole app
- This page must remain fast (no auth checks, no API calls on mount) since it's the first impression
- The `Dashboard` section here is a static preview/screenshot, not the actual authenticated dashboard
