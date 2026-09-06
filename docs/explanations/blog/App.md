# App.tsx (Blog Application)

**Location:** `prsnl/kareerist_blog/src/App.tsx`  
**Type:** Main React Component (Blog Feed & Viewer UI)

## What This File Does

This file is the main entry point and user-facing interface of the standalone blog application. It:
1. **Fetches Blog Posts:** Queries all articles from the Supabase database sorted by their `display_order` parameter.
2. **Renders Blog Cards:** Displays a main `featured` article card (large format, full-width) followed by a responsive grid of `standard` cards.
3. **Implements Article Reading:** Clicking an article opens a full-screen reading mode (`PostPage`) with custom routing.
4. **Parses Markdown Content:** Incorporates a custom, lightweight Markdown-to-React text parser that converts raw paragraphs, bold highlights, sub-headers, lists, and checklists into beautiful HTML elements.
5. **Registers Administrative Hotkeys:** Listens for custom keyboard hotkeys (`Ctrl+Shift+A`) to navigate to the hidden admin portal.

## How It Fits Into The System

- **What triggers it:** Loads immediately when visiting the root domain of the blog application.
- **What it depends on:**
  - `supabase.ts` — exports the active client and `BlogPost` interfaces.
  - `lucide-react` — provides standard graphics.
- **What depends on it:** Rendered as the primary routing viewport in Vite.

## Code Breakdown

### Custom Markdown-to-React Parser
**Lines:** 7–45  
Instead of importing heavy external markdown rendering libraries (which slow down page loads and hurt SEO performance), this file uses a lightweight, custom React parsing function `renderContent(content: string)`:
- Normalizes newlines and splits content into paragraphs.
- Detects lists (`•` or `-` prefixes) and groups them inside clean `ul` and `li` tags.
- Detects bold text (`**text**`) and wraps it inside `strong` tags.
- Detects subheadings (`### text` or `**Title:**`) and renders them using distinct header styling classes.
- Formats code/checklist blocks cleanly.

### Dynamic Rendering Feed
**Lines:** 114–192  
Maintains state objects `posts` (all fetched articles), `selectedPost` (active reading view), and `loading`.
- If `selectedPost` is active, it hides the list and displays the full-article reading panel.
- On the homepage, it separates the first post matching `type = 'featured'` and renders it as a prominent hero banner, listing all other standard posts in a responsive grid below.

### Hidden Administrative Hotkey
**Lines:** 210–223  
To keep the admin dashboard secure and hidden from standard readers, the application uses an event listener hook:
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      setView(view === 'admin' ? 'blog' : 'admin');
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [view]);
```
Pressing **`Ctrl+Shift+A`** anywhere on the blog toggles the viewport state between the blog feed and the administrative login portal.

## Things To Know Before Editing

- **Lightweight Parser Limitations:** The custom `renderContent` parser is optimized for simple markdown structures (paragraphs, bold text, subheadings, and basic bullet points). If you want to support more advanced markdown features (e.g. nested tables, code syntax highlighting, or custom HTML blocks), you may want to swap this function for a standard library like `react-markdown`.
- **Display Order:** The fetch query sorts posts by `display_order` ascending. This allows administrators to reposition articles by changing their number values.
