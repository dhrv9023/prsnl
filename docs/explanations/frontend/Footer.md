# Footer.tsx

**Location:** `prsnl/FRONTEND/src/components/layout/Footer.tsx`  
**Type:** Layout Component

## What This File Does

Site-wide footer with the company logo, a brief product description, social media links, organized link columns (Product, Support), copyright notice, and legal links (Privacy Policy, Terms of Service). Appears at the bottom of every page.

## How It Fits Into The System

- **Triggers:** Rendered in `Index.tsx` and potentially other page layouts
- **Dependencies:** React Router (Link component), icon library for social icons
- **Dependents:** None — purely presentational

## Code Breakdown

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Logo + Description          Product    Support     │
│  Social icons                - Resume   - Contact   │
│                              - Interview- Feedback   │
│                              - Cover    - Pricing    │
│                              - Dashboard             │
├─────────────────────────────────────────────────────┤
│  © 2024 Company Name    Privacy Policy | Terms      │
└─────────────────────────────────────────────────────┘
```

### Brand Column

- Logo (same as navbar)
- Short product description (1-2 sentences about what the platform does)
- Social media icon links (GitHub, Twitter/X, LinkedIn, etc.)

### Product Links

Links to main features:
- Resume Analysis → `/resume-analysis`
- AI Interview → `/interview`
- Cover Letter → `/cover-letter`
- Dashboard → `/dashboard`

### Support Links

- Contact → email or contact page
- Feedback → external form (Google Form, Typeform, etc.)
- Pricing → `/pricing`

### Legal Bar

Bottom row with:
- Copyright notice with current year
- Privacy Policy link
- Terms of Service link

## Things To Know Before Editing

- Social links open in new tabs (`target="_blank" rel="noopener noreferrer"`)
- Keep product links in sync with actual routes — dead links in the footer look unprofessional
- The feedback link is typically an external URL (Google Form) — not an internal route
- Copyright year should be dynamic (`new Date().getFullYear()`) or manually updated annually
- Footer is included on the landing page but may not appear on authenticated app pages (dashboard, analysis) — check where it's rendered
