# Pricing.tsx

**Locations:**  
- **Page Wrapper:** `prsnl/FRONTEND/src/pages/Pricing.tsx`
- **Section Component:** `prsnl/FRONTEND/src/components/sections/Pricing.tsx`

**Type:** Frontend Pages & Layout Components (Pricing Structure)

## What This File Does

These files implement and display the Kareerist pricing matrix. 
- The **Page Wrapper** sets up a clean, full-screen layout, bringing together the global `Navbar`, `Footer`, and mounting the central `Pricing` section.
- The **Section Component** contains the actual visual structure, data matrices, and animations describing the available pricing tiers (Starter, Pro, Power), credit balances associated with each, list of features unlocked, and beta notifications.

## How It Fits Into The System

- **What triggers it:** Accessed via user navigation to the `/pricing` client route or by clicking on "Pricing" in the main navigation bar.
- **What it depends on:**
  - `framer-motion` — handles smooth fade-ins and slide-ups as the element scrolls into view.
  - `lucide-react` — provides standard icons (`Check`, `Clock`).
- **What depends on it:** Main routers mount `PricingPage` at the `/pricing` endpoint.

## Code Breakdown

### Plans Data Matrix
**Lines:** 6–48 (in Section Component)  
Defines the plans structure:
- **Starter (Free):** Highlights 100 signup credits and basic ATS / cover letter / mock interview tools.
- **Pro (₹99/mo - Featured):** Unlocks 300 credits/mo, hiring intelligence reports, and priority speeds.
- **Power (₹249/mo):** Unlocks 1000 credits/mo and bulk processing.

### Scroll-triggered Entrance Animations
**Lines:** 51–53, 57–63, 80–84  
Uses Framer Motion's `useInView` hook alongside a DOM `ref` to check when the section is visible in the viewport:
```typescript
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: "-100px" });
```
When `isInView` transitions to `true`, initial opacity/y states animate to visible. The cards animate sequentially with a staggered `delay: index * 0.1` to create an elegant cascading entrance.

### Beta Status Overlay
**Lines:** 71–75, 117–121  
Because the payment processing gateway is not live during the initial launch, the system features a **Beta Warning Banner** ("Paid plans launching soon — all features free during beta") and greys out the signup buttons with a "Coming Soon" label, using a `.opacity-70` class and `cursor-not-allowed` styles.

## Things To Know Before Editing

- **Stripe/Razorpay Integration:** When integrating active checkout flows, replace the placeholder "Coming Soon" `div` block (Lines 117-121) with active payment link triggers or Stripe Checkout redirect elements.
- **Opacity Override:** Currently, the cards have `opacity-70` forced on them to reflect the inactive beta state. Remove `opacity-70` from the card styles once paid plans go live to increase visual contrast.
