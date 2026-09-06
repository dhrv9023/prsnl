# Admin.tsx (Blog Application)

**Location:** `prsnl/kareerist_blog/src/Admin.tsx`  
**Type:** React Page Component (Blog Administrative Panel & CRUD Dashboard)

## What This File Does

This file implements the secure administrative dashboard for managing the blog. It features a password-protected login screen, a list of all active articles showing current styling parameters, tools to delete articles, and a comprehensive creation form to write and publish new posts. To streamline content creation, the form integrates an automatic **Unsplash Cover Image Generator** that retrieves high-quality stock photos dynamically based on the article's topic.

## How It Fits Into The System

- **What triggers it:** Toggled visible by pressing `Ctrl+Shift+A` on the main blog page.
- **What it depends on:**
  - `supabase.ts` — handles all database insertion and deletion requests.
  - `import.meta.env.VITE_ADMIN_PASSWORD` — retrieved via Vite configurations for login verification.
- **What depends on it:** Restricts editing capabilities to authorized publishers.

## Code Breakdown

### Lightweight Administrative Passcode Lock
**Lines:** 12–106  
Because the blog runs as a serverless frontend app, it uses a lightweight passcode lock:
- The administrator enters a passcode.
- The component checks if this entry matches the environment variable `VITE_ADMIN_PASSWORD` (or defaults to `'kareeristadmin123'`).
- Upon verification, it saves a validation token in `localStorage` (`blog_admin_session = 'true'`) to persist the session, preventing the administrator from having to re-authenticate on every page refresh.

### Automatic Unsplash Image Suggestion
**Lines:** 190–205  
To make publishing articles fast and visually appealing, the dashboard features an automated image suggestion tool:
```typescript
const generateUnsplashUrl = () => {
  const query = category || title || "career";
  const sanitizedQuery = encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9 ]/g, ''));
  const randomId = Math.floor(Math.random() * 1000);
  const url = `https://images.unsplash.com/photo-${randomId}?w=800&h=500&fit=crop&q=80&sig=${randomId}&auto=format&q=80`;
  setFormData(prev => ({ ...prev, media_url: url }));
};
```
If the image URL field is empty, the editor automatically generates a search term based on the article's category or title. It constructs an optimized, crop-fit Unsplash image link using a signature parameter to ensure the generated cover image is unique.

### CRUD Actions
**Lines:** 108–188  
- **Delete Post**: Triggers `supabase.from('blog_posts').delete().eq('id', id)` to remove the target row instantly.
- **Submit Post**: Validates required inputs (title, category, content), aggregates form inputs into a structured database record, and runs `supabase.from('blog_posts').insert([newPost])` to publish the article. Once the insert completes successfully, it triggers a page reload to update the active feed.

## Things To Know Before Editing

- **Environment Configuration:** The administrative password is read from `VITE_ADMIN_PASSWORD` at build time. Ensure this environment variable is configured in your hosting dashboard (e.g. Vercel) before deploying to production.
- **Image URL Customization:** The Unsplash generator creates random photo placeholder URLs. Administrators can easily overwrite this generated link by pasting a direct URL to any custom image or hosted graphic in the input form.
- **Edit Feature:** The dashboard is optimized for creating and deleting posts. To edit an existing post, you can delete it and re-submit the updated draft, or perform modifications directly inside the Supabase SQL editor/table view.
