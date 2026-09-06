# Contact.tsx

**Location:** `prsnl/FRONTEND/src/pages/Contact.tsx`  
**Type:** React Page Component (Contact & Support Portal)

## What This File Does

This page provides the main contact and support channel for the Kareerist platform. It contains:
1. **Contact Information:** Direct email address (`kareerist2@gmail.com`), company location (Gurugram, India), support response time, and social media connectivity links.
2. **Contact Form:** A form allowing users to submit messages across multiple categories (General, Bug, Feature, Billing, Feedback, Other) with asynchronous visual feedback.
3. **Blog Feed Integration:** Dynamically fetches and showcases the 3 most recent blog posts from the standalone blog system in Supabase.
4. **FAQ Accordion:** An expandable list of frequently asked questions regarding support SLA, bug reports, and credit restorations.

## How It Fits Into The System

- **What triggers it:** Accessed via client routing to `/contact`.
- **What it depends on:**
  - `Navbar` and `Footer` layouts.
  - `useAuthContext` from `@/contexts/AuthContext` — auto-populates user's email into the contact form if they are signed in.
  - Supabase REST API — fetches the blog post feed directly from Supabase's HTTP endpoint.
- **What depends on it:** Main routing files map this page to the navigation bars and CTA footer links.

## Code Breakdown

### Dynamic Blog Fetching Hook
**Lines:** 32–52  
On component mount, a `useEffect` hook triggers a fetch request targeting the Supabase REST API:
```typescript
const res = await fetch(
    `https://qifdqnksyodhispfptgj.supabase.co/rest/v1/blog_posts?select=id,title,description,category,category_color,media_url,type&order=display_order.asc&limit=3`,
    {
        headers: {
            apikey: "...",
            Authorization: "Bearer ..."
        }
    }
);
if (res.ok) setBlogPosts(await res.json());
```
This fetches the top 3 blog posts sorted by their `display_order` ascending, complete with titles, descriptions, categories, styling colors, and media URLs. If the fetch fails (e.g. network issues), it fails silently so that the contact page remains fully functional without a broken layout.

### Contact Form Handler
**Lines:** 54–79  
The `handleSubmit` function manages the contact form submission. It captures state changes: `"idle" -> "sending" -> "success" / "error"`. 
Currently, it simulates a backend API call by waiting for 1.5 seconds via a Promise and then resets the form inputs (preserving user's email context) and displays a success alert banner that automatically vanishes after 5 seconds.

### FAQ Accordion
**Lines:** 471–533  
Implemented using standard HTML5 `<details>` and `<summary>` tags, styled elegantly with Tailwind CSS borders and backdrops. This provides a zero-JS accordion element that is lightweight, fully accessible, and responsive.

## Things To Know Before Editing

- **API Keys:** The Supabase endpoint and anonymous keys are hardcoded in the dynamic fetch method (Lines 36-41). If database credentials or ref addresses change, these values must be updated to align with the active Supabase configurations.
- **Backend integration:** The contact submission is currently simulated. A backend contact endpoint should be implemented in `backend/app/api/v1/endpoints/` and wired here to replace the simulated timer.
