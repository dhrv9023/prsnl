# Kareerist Updates — May 29, 2026

## Overview

This document details all changes made on May 29, 2026, focusing on admin panel enhancements, user activity tracking, and bug fixes.

---

## 1. Admin Panel — User Activity Modal

### Problem
Admins could see user credit balances but had no visibility into what users were actually doing (resumes uploaded, analyses run, interviews taken, cover letters generated).

### Solution
Added a comprehensive user activity modal accessible via an eye icon on each user row in the admin panel.

### Implementation

#### Backend: New Endpoint (`admin.py`)

```python
@router.get("/users/{target_user_id}/activity")
async def get_user_activity(target_user_id: str, user: CurrentUser):
    """Returns full activity summary for a specific user."""
    await _require_admin(user)
    supabase = await get_db()

    result = {}

    # Resumes
    r = await supabase.table("resumes") \
        .select("id, file_url, resume_quality_feedback, created_at") \
        .eq("user_id", target_user_id) \
        .order("created_at", desc=True).limit(20).execute()
    result["resumes"] = r.data or []

    # Analyses
    a = await supabase.table("ai_analyses") \
        .select("id, analysis_type, created_at") \
        .eq("user_id", target_user_id) \
        .order("created_at", desc=True).limit(30).execute()
    result["analyses"] = a.data or []

    # Interviews
    i = await supabase.table("interview_reports") \
        .select("id, overall_score, qualitative_score, role, experience_level, questions_count, created_at") \
        .eq("user_id", target_user_id) \
        .order("created_at", desc=True).limit(20).execute()
    result["interviews"] = i.data or []

    # Cover letters
    cl = await supabase.table("job_applications") \
        .select("id, company_name, job_title, created_at") \
        .eq("user_id", target_user_id) \
        .order("created_at", desc=True).limit(20).execute()
    result["cover_letters"] = cl.data or []

    # Credit transactions
    ct = await supabase.table("credit_transactions") \
        .select("id, feature, credits_used, credits_before, credits_after, created_at") \
        .eq("user_id", target_user_id) \
        .order("created_at", desc=True).limit(30).execute()
    result["credit_transactions"] = ct.data or []

    return result
```

#### Frontend: API Types (`api.ts`)

```typescript
export interface UserActivityResume {
    id: string;
    file_url: string;
    resume_quality_feedback: number | null;
    created_at: string;
}

export interface UserActivityAnalysis {
    id: string;
    analysis_type: string;
    created_at: string;
}

export interface UserActivityInterview {
    id: string;
    overall_score: number;
    qualitative_score: string | null;
    role: string | null;
    experience_level: string | null;
    questions_count: number;
    created_at: string;
}

export interface UserActivityCoverLetter {
    id: string;
    company_name: string | null;
    job_title: string | null;
    created_at: string;
}

export interface UserActivityCreditTxn {
    id: string;
    feature: string;
    credits_used: number;
    credits_before: number;
    credits_after: number;
    created_at: string;
}

export interface UserActivity {
    resumes: UserActivityResume[];
    analyses: UserActivityAnalysis[];
    interviews: UserActivityInterview[];
    cover_letters: UserActivityCoverLetter[];
    credit_transactions: UserActivityCreditTxn[];
}

export async function apiGetUserActivity(userId: string): Promise<UserActivity> {
    return request(`/admin/users/${userId}/activity`);
}
```

#### Frontend: Modal Component (`AdminPage.tsx`)

```typescript
function UserActivityModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
    const [activity, setActivity] = useState<UserActivity | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"resumes" | "analyses" | "interviews" | "cover_letters" | "credits">("analyses");

    useEffect(() => {
        apiGetUserActivity(user.id)
            .then(setActivity)
            .catch(() => setActivity(null))
            .finally(() => setLoading(false));
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border/30 bg-background shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header with user info */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {(user.email?.[0] ?? "U").toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground/50">
                                Joined {timeAgo(user.created_at)} · Last login: <span className="text-green-400/80">{timeAgo(user.last_sign_in_at)}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary/40 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-4 gap-px bg-border/10 flex-shrink-0">
                    {[
                        { label: "Resumes", value: activity?.resumes.length ?? "—", color: "text-blue-400" },
                        { label: "Analyses", value: activity?.analyses.length ?? "—", color: "text-purple-400" },
                        { label: "Interviews", value: activity?.interviews.length ?? "—", color: "text-teal-400" },
                        { label: "Cover Letters", value: activity?.cover_letters.length ?? "—", color: "text-amber-400" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-card/40 px-4 py-3 text-center">
                            <p className={`text-lg font-bold ${color}`}>{loading ? "…" : value}</p>
                            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-4 pt-3 border-b border-border/15 flex-shrink-0 overflow-x-auto">
                    {(["analyses", "interviews", "resumes", "cover_letters", "credits"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-3 py-2 text-xs font-semibold capitalize whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                            }`}>
                            {tab.replace("_", " ")}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-lg bg-border/15 animate-pulse" />)}</div>
                    ) : !activity ? (
                        <p className="text-sm text-muted-foreground/40 text-center py-8">Failed to load activity.</p>
                    ) : (
                        <>
                            {/* Tab content for each activity type */}
                            {/* ... (see AdminPage.tsx for full implementation) */}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
```

### Files Changed
- `backend/app/api/v1/endpoints/admin.py` - Added `/users/{user_id}/activity` endpoint
- `FRONTEND/src/lib/api.ts` - Added activity types and `apiGetUserActivity()` function
- `FRONTEND/src/pages/AdminPage.tsx` - Added `UserActivityModal` component and eye icon button

---

## 2. Admin Panel — User Search

### Problem
With many users, admins had to scroll through the entire list to find a specific user.

### Solution
Added a search box that filters users by email or full name in real-time.

### Implementation

```typescript
const [search, setSearch] = useState("");

const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
);

// In JSX:
<div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
    <input
        type="text"
        placeholder="Search by email or name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="pl-8 pr-3 h-8 w-64 bg-secondary/20 border border-border/30 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
    />
    {search && (
        <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground" />
        </button>
    )}
</div>
```

### Files Changed
- `FRONTEND/src/pages/AdminPage.tsx` - Added search state and filtering logic

---

## 3. Admin Panel — User List Sorting

### Problem
Users were sorted by join date (`created_at`), not by activity. Admins couldn't easily see who logged in recently.

### Solution
Changed sorting to `last_sign_in_at DESC` so most recently active users appear at the top.

### Implementation

```python
# Before:
profiles_resp = await supabase.table("profiles") \
    .select(...) \
    .order("created_at", desc=True) \
    .execute()

# After:
profiles_resp = await supabase.table("profiles") \
    .select(...) \
    .order("last_sign_in_at", desc=True) \
    .execute()
```

### Files Changed
- `backend/app/api/v1/endpoints/admin.py` - Updated `GET /admin/users` sorting

---

## 4. Interview Session — Resume ID Tracking

### Problem
When users completed interviews, the system didn't know which resume they used. This made it impossible to link interviews to specific resumes in the dashboard.

### Solution
Added `resume_id` field to `InterviewSession` model and persisted it to `interview_reports` table.

### Implementation

#### Backend: Model Update (`schemas/models.py`)

```python
class InterviewSession(BaseModel):
    resume_text: str = ""
    role: str = ""
    experience_level: str = ""
    resume_id: str | None = None  # ← NEW
    questions: List[InterviewQuestion] = []
    answers: Dict[int, str] = {}
    evaluations: Dict[int, AnswerEvaluation] = {}
```

#### Backend: Session Initialization (`interview.py`)

```python
# Before:
session = InterviewSession(
    resume_text=resume_text,
    role=body.role,
    experience_level=body.experience_level,
)
session.resume_id = body.resume_id  # type: ignore[attr-defined]

# After:
session = InterviewSession(
    resume_text=resume_text,
    role=body.role,
    experience_level=body.experience_level,
    resume_id=body.resume_id,  # ← Proper initialization
)
```

#### Backend: Report Persistence (`interview.py`)

```python
report_record = {
    "user_id": user_id_str,
    "overall_score": overall,
    "qualitative_score": qual_score,
    "breakdown": breakdown,
    "role": session.role,
    "experience_level": session.experience_level,
    "questions_count": len(session.questions),
    "answers_count": count,
    "resume_id": getattr(session, "resume_id", None),  # ← Saved to DB
}
await supabase.table("interview_reports").insert(report_record).execute()
```

### Files Changed
- `backend/app/schemas/models.py` - Added `resume_id` field to `InterviewSession`
- `backend/app/api/v1/endpoints/interview.py` - Updated session initialization and report persistence

---

## 5. Backend URL Configuration

### Problem
Frontend was configured to use wrong backend URL (`https://prsnl-onrender-com-api.onrender.com` instead of `https://prsnl.onrender.com`), causing all API requests to fail with 404.

### Solution
Updated `VITE_API_BASE` environment variable in Vercel to correct URL.

### Implementation

**Vercel Environment Variables:**
```
VITE_API_BASE=https://prsnl.onrender.com
VITE_SUPABASE_URL=https://uniwhigyvfbgkkgiiwgi.supabase.co
VITE_SUPABASE_ANON_KEY=<key>
```

**Local Development (.env.local):**
```
VITE_API_BASE=https://prsnl.onrender.com
VITE_SUPABASE_URL=https://uniwhigyvfbgkkgiiwgi.supabase.co
VITE_SUPABASE_ANON_KEY=<key>
```

### Files Changed
- `FRONTEND/.env.local` - Updated `VITE_API_BASE`
- Vercel Dashboard - Updated environment variables

---

## Summary of Changes

| Component | Change | Impact |
|-----------|--------|--------|
| Admin Panel | Added user activity modal | Visibility into user behavior |
| Admin Panel | Added user search | Easier user management |
| Admin Panel | Changed sort to last login | Better activity tracking |
| Interview | Added resume_id tracking | Linked interviews to resumes |
| Backend URL | Fixed configuration | API requests now work |

---

## Testing Checklist

- [x] User activity modal opens and loads data
- [x] All 5 tabs (analyses, interviews, resumes, cover letters, credits) display correctly
- [x] Search filters users by email and name
- [x] User list sorted by last login (most recent first)
- [x] Interview reports saved with resume_id
- [x] Backend API requests succeed with correct URL

---

## Commits

```
cd9268c - fix: Sort users by last_sign_in_at (most recent login first)
f342113 - feat: Enhanced admin panel - fix last login time, add user activity modal, search
108c6d3 - Fix: Add resume_id field to InterviewSession model
```

---

## Files Modified

- `backend/app/api/v1/endpoints/admin.py` - New activity endpoint, sorting fix
- `backend/app/schemas/models.py` - Added resume_id to InterviewSession
- `backend/app/api/v1/endpoints/interview.py` - Resume ID initialization and persistence
- `FRONTEND/src/lib/api.ts` - Activity types and API function
- `FRONTEND/src/pages/AdminPage.tsx` - Modal, search, sorting
- `FRONTEND/.env.local` - Backend URL fix

---

*Last Updated: May 29, 2026*
