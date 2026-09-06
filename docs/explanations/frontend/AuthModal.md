# AuthModal.tsx

**Location:** `prsnl/FRONTEND/src/components/ui/AuthModal.tsx`  
**Type:** UI Component

## What This File Does

A modal overlay that handles both login and signup flows. Displays a Google OAuth button, an email/password form, and a toggle to switch between login and signup modes. Shows loading states during authentication and error messages on failure. Calls an `onSuccess` callback when authentication completes.

## How It Fits Into The System

- **Triggers:** Opened by Navbar's "Sign In" button or when accessing protected features while unauthenticated
- **Dependencies:** `useAuthContext` (login, signup, loginWithGoogle, error, clearError)
- **Dependents:** Navbar (controls visibility), any component that needs to trigger auth

## Code Breakdown

### Props

```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
```

### Modal Overlay

Renders a `fixed inset-0` backdrop (semi-transparent overlay) via `createPortal` directly into `document.body`. The modal content is centered and prevents click-through to the backdrop.

**Mobile scroll lock:** A `useEffect` sets `document.body.style.overflow = 'hidden'` on mount and restores the previous value on unmount. This prevents the page behind the modal from scrolling on touch devices — without it, touching the backdrop causes the background to scroll upward (a known mobile browser behaviour with `position: fixed` backdrops).

```typescript
useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
}, []);
```

### Google OAuth Button

Prominent button at the top: "Continue with Google". Calls `loginWithGoogle()` from auth context, which initiates the PKCE OAuth redirect. The modal closes as the browser navigates away.

### Divider

Visual "or" separator between OAuth and email/password form.

### Email/Password Form

- **Email Input:** Validated for format
- **Password Input:** Minimum length validation
- **Submit Button:** Text changes based on mode ("Sign In" vs "Create Account")
- **Loading State:** Button shows spinner, inputs disabled during API call

### Mode Toggle

Link at the bottom: "Don't have an account? Sign up" / "Already have an account? Sign in". Toggles between login and signup mode, which changes:
- Submit button text
- API call (apiLogin vs apiSignup)
- Toggle link text

### Error Display

Shows error messages from auth context (invalid credentials, account exists, etc.) in a red alert box. Errors are cleared when:
- User starts typing
- User switches modes
- Modal is closed

### Success Flow

On successful login/signup:
1. Calls `onSuccess()` callback (if provided)
2. Parent component (Navbar) handles navigation and modal closing

## Things To Know Before Editing

- The modal doesn't manage its own open/close state — it's controlled by the parent via `isOpen` prop
- Google OAuth navigates away from the page — the modal won't be visible when the user returns (they land on `/auth/callback`)
- Error state comes from `useAuthContext`, not local state — `clearError()` must be called on dismiss
- Form validation is basic (HTML5 + minimal JS) — not using a form library
- The modal should trap focus for accessibility (tab cycling within modal, Escape to close)
- Ensure the modal renders in a portal (outside the DOM hierarchy) to avoid z-index issues
- **Body scroll lock:** If you add any other portal-based overlays (drawers, sheets, etc.) that also lock body scroll, make sure the restore logic uses the previous value (`const prev = document.body.style.overflow`) rather than unconditionally setting it to `""` — otherwise the last modal to unmount will unlock scroll even if another modal is still open

*Last updated: Sep 6, 2026 — added mobile scroll-lock `useEffect`*
