# CreditBadge.tsx

**Location:** `prsnl/FRONTEND/src/components/ui/CreditBadge.tsx`  
**Type:** UI Component

## What This File Does

A compact pill-shaped badge for the navbar that shows the user's remaining credits out of their total. Links to the `/credits` page when clicked. Color-coded based on credit percentage remaining, with special handling for admin users (shows "Unlimited" with an infinity icon).

## How It Fits Into The System

- **Triggers:** Rendered in the Navbar when user is authenticated
- **Dependencies:** `useCreditContext` (balance, totalCredits, loading), `useAuthContext` (user.is_admin), React Router (Link)
- **Dependents:** Navbar component

## Code Breakdown

### Display Logic

```
[🪙 45/100]  ← normal user
[∞ Unlimited] ← admin user
[░░░░░░░░░░]  ← loading skeleton
```

### Color Coding

Based on `balance / totalCredits` percentage:
- **Green (>25%):** Healthy credit level — default/neutral styling
- **Amber (10-25%):** Running low — yellow/orange tint to draw attention
- **Red (<10%):** Critical — red styling to urgently signal low credits

### Admin Override

If `user.is_admin` is `true` (or user has unlimited credits), displays:
- Infinity icon (∞)
- Text: "Unlimited"
- Neutral/special styling (no color urgency)

### Loading State

While `CreditContext` is still fetching balance data, shows an animated skeleton placeholder matching the badge dimensions. Prevents layout shift.

### Link Behavior

The entire badge is wrapped in a `<Link to="/credits">` — clicking anywhere on it navigates to the credits management page.

## Things To Know Before Editing

- The badge only renders when the user is authenticated — the parent (Navbar) handles this conditional
- Color thresholds should match those in `CreditDisplay.tsx` for consistency
- The skeleton width should approximate the rendered badge width to prevent layout shift
- Admin detection might check `user.is_admin` OR `user.unlimited_credits` — verify which field the backend sends
- Keep the badge compact — it sits in the navbar alongside other elements and shouldn't dominate
- The coin icon (🪙 or a custom SVG) should be small and not add excessive width
