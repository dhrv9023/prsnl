# Navbar.tsx

**Location:** `prsnl/FRONTEND/src/components/layout/Navbar.tsx`  
**Type:** Layout Component

## What This File Does

Fixed header navigation bar with logo, desktop navigation links (Home, Features dropdown, Pricing, Contact), action buttons (theme toggle, credit badge, sign in / profile dropdown), and a mobile hamburger menu. Handles authentication modal display and post-login redirect storage.

## How It Fits Into The System

- **Triggers:** Rendered on every page (included in Index.tsx and potentially in a layout wrapper)
- **Dependencies:** `useAuthContext`, `useCreditContext`, `AuthModal`, `CreditBadge`, `ThemeToggle`, React Router
- **Dependents:** None directly — but controls auth modal visibility and navigation

## Code Breakdown

### Desktop Navigation

Left side of the navbar:
- **Logo:** Links to `/`
- **Home:** Link to `/`
- **Features Dropdown:** Hover/click reveals a dropdown with feature links:
  - Resume Analysis (live) — links to `/resume-analysis`
  - AI Interview (live) — links to `/interview`
  - Cover Letter (live) — links to `/cover-letter`
  - Coming soon items shown with a badge/different styling
  - Each item has a title and short description
- **Pricing:** Link to `/pricing`
- **Contact:** Link or scroll anchor

### Action Area (Right Side)

- **Theme Toggle:** Dark/light mode switch (from `theme-toggle.tsx`)
- **Credit Badge:** Shows remaining credits (only when logged in) — links to `/credits`
- **Sign In Button:** Shows when not authenticated — opens `AuthModal`
- **Profile Dropdown:** Shows when authenticated — contains:
  - User email display
  - Admin badge (if `is_admin`)
  - Dashboard link
  - Admin link (if admin)
  - Logout button

### Mobile Menu

Hamburger icon that opens a slide-out or dropdown menu containing all navigation links and actions in a vertical layout. Uses the `useIsMobile` hook or responsive CSS to toggle between desktop and mobile layouts.

### Auth Modal Integration

- `showAuthModal` state controls modal visibility
- "Sign In" button sets it to `true`
- `AuthModal` receives `onClose` and `onSuccess` callbacks
- On success: closes modal, optionally navigates to stored redirect

### Post-Login Redirect

When a user clicks a protected feature link while not authenticated:
1. Stores the target path in `sessionStorage`
2. Opens the auth modal
3. After successful login, reads the stored path and navigates there
4. Clears the stored path

## Things To Know Before Editing

- The navbar is `position: fixed` — content below needs appropriate top padding/margin
- The Features dropdown has both live and coming-soon items — update the list when launching new features
- Auth modal state lives here, not in a global context — if you need to trigger it from elsewhere, you'll need to lift state or use an event
- The credit badge only renders when `user` is truthy — no need for conditional checks inside `CreditBadge`
- Mobile menu should mirror desktop navigation exactly — keep them in sync when adding links
- z-index of the navbar must be higher than page content but lower than modals
