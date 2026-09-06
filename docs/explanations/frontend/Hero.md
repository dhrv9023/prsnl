# Hero.tsx

**Location:** `prsnl/FRONTEND/src/components/sections/Hero.tsx`  
**Type:** Frontend Layout Component (Landing Page Hero Banner)

## What This File Does

This component renders the primary visual hero section of the Kareerist landing page. It introduces the core value proposition of the product using premium typography and dynamic animation elements. It features responsive text, interactive background floating shapes, trust indicators, and a central call-to-action button ("Enter Kareerist") that launches the authentication panel or redirects the user based on their login status.

## How It Fits Into The System

- **What triggers it:** Rendered as the topmost layout element inside the main `/` landing page path (`Index.tsx`).
- **What it depends on:**
  - `framer-motion` — coordinates entering slide-ups and floating graphics.
  - `useAuthContext` from `@/contexts/AuthContext` — checks active login sessions.
  - `AuthModal` from `@/components/ui/AuthModal` — prompts credential entry for guests.
- **What depends on it:** Core homepage orchestrators mount this component to establish the product's premium branding immediately upon load.

## Code Breakdown

### Dynamic Auth Redirection
**Lines:** 13–21, 112–132  
The CTA button links to `handleEnterKareerist()`:
```typescript
const handleEnterKareerist = () => {
  if (auth.isAuthenticated) {
    navigate("/dashboard");
  } else {
    sessionStorage.setItem("redirectAfterLogin", "/dashboard");
    setShowAuthModal(true);
  }
};
```
If logged in, the user immediately enters the active dashboard. If not, the application stores the user's intent to visit the dashboard in `sessionStorage` and launches the `AuthModal` popup. Once sign-in completes, the auth hook triggers `onSuccess`, retrieves the target from `sessionStorage`, and transitions the route.

### Ambient Floating Visual Elements
**Lines:** 24–31  
Renders overlapping layered graphics to create depth:
- A subtle base gradient overlay (`gradient-subtle` styled classes in CSS).
- Bordered circles executing continuous translation keyframe loops (`animate-float` / `animation-delay-200`) representing orbital career pathways.
- Accent dots scattered to draw the eye toward the central headers.

### Entrance Animations
**Lines:** 36–74  
Uses Framer Motion tags (`motion.div`, `motion.h1`, `motion.p`) configured with sequential delay modifiers (`0.1s`, `0.2s`, `0.35s`, `0.5s`) to animate elements into view smoothly. This staggered animation enhances the premium, polished feel of the platform.

## Things To Know Before Editing

- **Redirection Logic:** If you introduce new onboarding paths (e.g. customized workspace setups or checkout funnels), adjust the `sessionStorage` fallback parameter in `handleEnterKareerist` to route users appropriately after login.
- **Animation Performance:** The float animations use CSS transitions which are GPU-accelerated and highly performant. Avoid changing these to complex JS loops.
