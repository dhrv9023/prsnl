# Diagram 6: Blog System

[← Back to Master Index](../../ARCHITECTURE_FLOWCHARTS.md)

---

```mermaid
graph TD
    classDef frontend fill:#1d4ed8,color:#fff,stroke:#1e40af
    classDef db fill:#ca8a04,color:#fff,stroke:#a16207
    classDef external fill:#7c3aed,color:#fff,stroke:#6d28d9

    subgraph BLOG["kareerist_blog/ - Separate Vite+React App"]
        BHome["Home Page<br/>Featured post hero + 3-col grid"]
        BArticle["Article Reader Page<br/>Full content with bold+bullets rendering"]
        BAdmin["Password-Protected Admin<br/>Ctrl+Shift+A -> login screen<br/>sessionStorage persistence"]
        BCreate["Create Post Tab<br/>cover_image URL preview<br/>Category selector (10 categories)"]
        BManage["Manage Posts Tab<br/>list + thumbnail + delete confirm"]
    end

    subgraph SUPABASE_BLOG["Supabase blog_posts table"]
        BlogTable["blog_posts<br/>id, title, excerpt, content<br/>category, cover_image<br/>author, date, featured<br/>created_at"]
        BlogRLS["RLS: anon READ<br/>anon WRITE (admin panel)<br/>no auth required"]
    end

    VERCEL_BLOG["Vercel<br/>kareerisit-blog.vercel.app<br/>Separate deployment"]
    GITHUB_BLOG["github.com/dhrv9023/kareerisit_blog<br/>Separate repo"]

    BHome -->|SELECT * FROM blog_posts<br/>ORDER BY date DESC| BlogTable
    BArticle -->|SELECT * FROM blog_posts WHERE id=?| BlogTable
    BAdmin -->|password check (hardcoded?)<br/>INSERT INTO blog_posts| BlogTable
    BManage -->|DELETE FROM blog_posts WHERE id=?| BlogTable

    subgraph SOFAR["kareerist_sofar/ - Development Journal"]
        SF["15 Markdown chapters<br/>chapter_01 through chapter_12<br/>INDEX.md + UPDATES files<br/>Not deployed — local docs only"]
    end
    class BAdmin,BArticle,BHome,BManage,BCreate,SF frontend;
    class BlogTable,BlogRLS db;
    class VERCEL_BLOG,GITHUB_BLOG external;
```
