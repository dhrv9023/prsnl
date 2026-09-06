# supabase.ts (Blog Application)

**Location:** `prsnl/kareerist_blog/src/supabase.ts`  
**Type:** Configuration File / Service Client (Supabase client and interfaces)

## What This File Does

This file initializes and exports the single shared Supabase client used throughout the blog application. It reads target credentials from Vite-compatible environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) and defines the core `BlogPost` TypeScript interface to ensure strict type safety across forms, API calls, and cards.

## How It Fits Into The System

- **What triggers it:** Imported automatically by any page or component that communicates with the Supabase database.
- **What it depends on:**
  - `@supabase/supabase-js` — the official Supabase JavaScript SDK.
- **What depends on it:**
  - `App.tsx` — uses it to query the database.
  - `Admin.tsx` — uses it to run insertions and deletions.

## Code Breakdown

### Client Initialization
**Lines:** 3–14  
Loads database credentials from Vite environment variables:
- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_ANON_KEY`

If these variables are missing during development, it prints a helpful warning in the browser console and defaults to placeholder credentials to prevent the build process from crashing. It then initializes and exports the active `supabase` client.

### `BlogPost` TypeScript Interface
**Lines:** 16–31  
Declares the strict TypeScript schema representing a blog post:
```typescript
export interface BlogPost {
  id: string
  type: 'featured' | 'standard'
  badge?: string
  title: string
  description?: string
  content?: string
  author?: string
  category: string
  category_color: string
  media_url: string
  media_type: 'image' | 'video'
  display_order: number
  created_at: string
  updated_at?: string
}
```
This maps perfectly to the database table schema, ensuring that any forms, cards, or views maintain complete type integrity.

## Things To Know Before Editing

- **Vite Environment Prefix:** Because this sub-project is built with Vite, all environment variables must be prefixed with `VITE_` (e.g. `VITE_SUPABASE_URL`) to be exposed to the client-side code.
- **Anonymous Access:** The client uses the anonymous API key (`VITE_SUPABASE_ANON_KEY`), meaning all operations must be authorized by Row-Level Security (RLS) policies defined in the Supabase database.
