# Diagram 6: Blog System Architecture

[← Back to Architecture Hub](../README.md) · [← Documentation Hub](../../README.md)

---

> 💡 **Quick Visual Preview:** In Antigravity IDE / VS Code, press **Ctrl + Shift + V** (or click the **Open Preview to the Side** icon at top-right) to view this flowchart rendered visually.
> 🌐 **Interactive Canvas Viewer:** You can also open [architecture_viewer.html](../architecture_viewer.html) directly in any web browser to pan, zoom, and inspect components.

---


## 📰 Blog Micro-Frontend Architecture (At a Glance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KAREERIST BLOG APPLICATION                         │
│                    (Standalone Vite + React Micro-Frontend)                 │
│                                                                             │
│  ├── /                -> Article List Grid & Featured Post Hero             │
│  ├── /article/:id     -> Markdown Reader & Social Sharing                   │
│  └── /admin           -> Secret Admin Portal (Ctrl+Shift+A)                 │
│                           • Create Post with Cover Preview                  │
│                           • Manage / Edit / Delete Articles                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Direct Supabase JS Client (HTTPS)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE CMS (blog_posts)                           │
│  • Columns: id, title, excerpt, content (markdown), category, cover_image   │
│  • Public Read Policy: Any visitor can read published posts                 │
│  • Admin Write Policy: Secured via password/session key                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Technical Flowchart (Mermaid)

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'fontSize': '15px', 'fontFamily': 'Inter, system-ui, sans-serif'}, 'flowchart': {'nodeSpacing': 80, 'rankSpacing': 95, 'padding': 22, 'curve': 'basis'}}}%%
flowchart TD
    subgraph CLIENT["Blog Micro-Frontend (kareerist_blog/)"]
        READER["Article Reader Page<br/>Full markdown parsing"]
        FEED["Blog Feed Grid<br/>Featured hero + Category filter"]
        ADMIN["Secret Admin Panel<br/>Triggered via key shortcut"]
    end

    subgraph CMS["Supabase Database"]
        TABLE[("blog_posts table<br/>title · excerpt · content<br/>category · cover_image")]
        STORAGE[("Cover Image Storage<br/>Public CDN links")]
    end

    FEED -->|SELECT * FROM blog_posts<br/>ORDER BY created_at DESC| TABLE
    READER -->|SELECT * FROM blog_posts WHERE id = ?| TABLE
    ADMIN -->|INSERT / UPDATE / DELETE| TABLE
    ADMIN -.->|Upload Post Assets| STORAGE
```

---

## 🔑 Subsystem Specifications

| Component | Repository & Deployment | Technical Details |
|---|---|---|
| **Blog Application** | `kareerist_blog/` (Standalone repository) | React + Vite + Tailwind CSS. Deployed independently to Vercel. |
| **CMS Storage** | Supabase `blog_posts` table | PostgreSQL database storing rich article text, category tags, author metadata, and cover URLs. |
| **Admin Access** | In-app modal | Admin interface accessible by site administrators to compose, format, and publish articles without a full backend CMS. |
