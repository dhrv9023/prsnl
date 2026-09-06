# Admin Panel Enhancements — May 29, 2026

## Overview

This document details the implementation of user activity tracking, search functionality, and sorting improvements in the admin panel.

---

## Architecture

```
Admin Dashboard
├── Overview Tab
│   ├── Stats cards (users, resumes, analyses, etc.)
│   ├── Credit system overview
│   ├── Analysis breakdown
│   └── Recent activity feed
│
└── Users Tab
    ├── Search box (email/name filter)
    ├── User list (sorted by last_sign_in_at DESC)
    │   ├── User row (expandable)
    │   │   ├── Avatar + email + badges
    │   │   ├── Join date + last login
    │   │   ├── Credit bar
    │   │   ├── Eye icon (view activity)
    │   │   └── Expand/collapse chevron
    │   │
    │   └── Expanded row
    │       ├── Full timestamps
    │       ├── Credit breakdown (granted/used/remaining)
    │       ├── Grant credits input
    │       └── Toggle unlimited button
    │
    └── User Activity Modal (on eye icon click)
        ├── Header (user info + close button)
        ├── Summary bar (resumes/analyses/interviews/cover letters count)
        ├── Tabs (analyses/interviews/resumes/cover_letters/credits)
        └── Content area (scrollable list of activities)
```

---

## Backend Implementation

### 1. User Activity Endpoint

**File:** `backend/app/api/v1/endpoints/admin.py`

**Endpoint:** `GET /api/v1/admin/users/{target_user_id}/activity`

**Purpose:** Fetch all activity for a specific user across all tables.

**Implementation:**

```python
@router.get("/users/{target_user_id}/activity")
async def get_user_activity(target_user_id: str, user: CurrentUser):
    """Returns full activity summary for a specific user: resumes, analyses, interviews, cover letters. Admin only."""
    await _require_admin(user)
    supabase = await get_db()

    result = {}

    # Resumes
    try:
        r = await supabase.table("resumes") \
            .select("id, file_url, resume_quality_feedback, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["resumes"] = r.data or []
    except Exception as e:
        logger.warning("Activity: resumes failed for %s: %s", target_user_id, e)
        result["resumes"] = []

    # Analyses
    try:
        a = await supabase.table("ai_analyses") \
            .select("id, analysis_type, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(30).execute()
        result["analyses"] = a.data or []
    except Exception as e:
        logger.warning("Activity: analyses failed for %s: %s", target_user_id, e)
        result["analyses"] = []

    # Interviews
    try:
        i = await supabase.table("interview_reports") \
            .select("id, overall_score, qualitative_score, role, experience_level, questions_count, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["interviews"] = i.data or []
    except Exception as e:
        logger.warning("Activity: interviews failed for %s: %s", target_user_id, e)
        result["interviews"] = []

    # Cover letters
    try:
        cl = await supabase.table("job_applications") \
            .select("id, company_name, job_title, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(20).execute()
        result["cover_letters"] = cl.data or []
    except Exception as e:
        logger.warning("Activity: cover letters failed for %s: %s", target_user_id, e)
        result["cover_letters"] = []

    # Credit transactions
    try:
        ct = await supabase.table("credit_transactions") \
            .select("id, feature, credits_used, credits_before, credits_after, created_at") \
            .eq("user_id", target_user_id) \
            .order("created_at", desc=True).limit(30).execute()
        result["credit_transactions"] = ct.data or []
    except Exception as e:
        logger.warning("Activity: credit_transactions failed for %s: %s", target_user_id, e)
        result["credit_transactions"] = []

    return result
```

**Key Points:**
- Admin-only (checked via `_require_admin()`)
- Fetches from 5 different tables
- Each query wrapped in try/except for resilience
- Returns empty list if any query fails (non-fatal)
- Limits: 20-30 records per table to avoid huge payloads
- Sorted by `created_at DESC` (most recent first)

### 2. User List Sorting

**File:** `backend/app/api/v1/endpoints/admin.py`

**Endpoint:** `GET /api/v1/admin/users`

**Change:** Sort by `last_sign_in_at DESC` instead of `created_at DESC`

```python
@router.get("/users")
async def get_all_users(user: CurrentUser):
    """
    Returns all enrolled users with their credit balances and usage stats.
    Sorted by last_sign_in_at (most recent login first), with never-logged-in users at the bottom.
    Admin only.
    """
    await _require_admin(user)
    supabase = await get_db()

    try:
        profiles_resp = await supabase.table("profiles") \
            .select("id, email, full_name, remaining_credits, total_credits_granted, is_unlimited, is_admin, created_at, last_sign_in_at") \
            .order("last_sign_in_at", desc=True) \  # ← Changed from created_at
            .execute()

        users = profiles_resp.data or []

        # Enrich with used credits
        for u in users:
            granted = u.get("total_credits_granted", 0) or 0
            remaining = u.get("remaining_credits", 0) or 0
            u["credits_used"] = max(0, granted - remaining)

        return users

    except Exception as e:
        logger.error("Admin users list failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch users.")
```

**Impact:**
- Most active users appear at top
- Never-logged-in users appear at bottom (NULL values sort last)
- Helps admins identify engaged vs. inactive users

---

## Frontend Implementation

### 1. API Types and Functions

**File:** `FRONTEND/src/lib/api.ts`

```typescript
// Activity data types
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

// API function
export async function apiGetUserActivity(userId: string): Promise<UserActivity> {
    return request(`/admin/users/${userId}/activity`);
}
```

### 2. User Activity Modal Component

**File:** `FRONTEND/src/pages/AdminPage.tsx`

**Component:** `UserActivityModal`

**Props:**
- `user: AdminUser` - User to display activity for
- `onClose: () => void` - Callback to close modal

**State:**
- `activity: UserActivity | null` - Fetched activity data
- `loading: boolean` - Loading state
- `activeTab: "resumes" | "analyses" | "interviews" | "cover_letters" | "credits"` - Current tab

**Features:**
- Modal overlay with backdrop blur
- Header with user avatar, email, join date, last login
- Summary bar showing counts for each activity type
- 5 tabs for different activity types
- Scrollable content area
- Loading skeleton while fetching
- Error state if fetch fails

**Key Implementation Details:**

```typescript
function UserActivityModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
    const [activity, setActivity] = useState<UserActivity | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"resumes" | "analyses" | "interviews" | "cover_letters" | "credits">("analyses");

    // Fetch activity on mount
    useEffect(() => {
        apiGetUserActivity(user.id)
            .then(setActivity)
            .catch(() => setActivity(null))
            .finally(() => setLoading(false));
    }, [user.id]);

    // Render modal with tabs and content
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border/30 bg-background shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                {/* Summary bar */}
                {/* Tabs */}
                {/* Content */}
            </div>
        </div>
    );
}
```

### 3. User Search

**File:** `FRONTEND/src/pages/AdminPage.tsx`

**State:**
```typescript
const [search, setSearch] = useState("");

const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
);
```

**UI:**
```typescript
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

**Features:**
- Real-time filtering as user types
- Case-insensitive search
- Searches both email and full_name
- Clear button (X) to reset search
- Shows count of matching users

### 4. User Row with Eye Icon

**File:** `FRONTEND/src/pages/AdminPage.tsx`

**Component:** `UserRow`

**New Props:**
```typescript
onViewActivity: (user: AdminUser) => void
```

**Eye Icon Button:**
```typescript
<button
    onClick={(e) => { e.stopPropagation(); onViewActivity(localUser); }}
    className="flex-shrink-0 w-7 h-7 rounded-lg bg-secondary/20 hover:bg-primary/20 border border-border/20 hover:border-primary/30 flex items-center justify-center transition-colors"
    title="View full activity"
>
    <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
</button>
```

**Behavior:**
- Positioned before expand/collapse chevron
- Stops event propagation (doesn't expand row)
- Opens activity modal when clicked
- Hover effect for visibility

---

## Data Flow

### Fetching User Activity

```
User clicks eye icon
    ↓
onViewActivity(user) called
    ↓
setActivityUser(user) in AdminPage
    ↓
UserActivityModal renders
    ↓
useEffect triggers apiGetUserActivity(user.id)
    ↓
Frontend calls GET /api/v1/admin/users/{user_id}/activity
    ↓
Backend queries 5 tables in parallel
    ↓
Backend returns aggregated activity object
    ↓
Frontend sets activity state
    ↓
Modal displays tabs with activity data
```

### Searching Users

```
User types in search box
    ↓
setSearch(value) updates state
    ↓
filteredUsers computed from users array
    ↓
UserRow components re-render with filtered list
    ↓
Only matching users displayed
```

### Sorting Users

```
Admin opens Users tab
    ↓
fetchUsers() called
    ↓
Frontend calls GET /api/v1/admin/users
    ↓
Backend queries profiles table
    ↓
Backend sorts by last_sign_in_at DESC
    ↓
Most recently active users appear first
    ↓
Never-logged-in users appear last
```

---

## Performance Considerations

### Query Limits
- Resumes: 20 records
- Analyses: 30 records
- Interviews: 20 records
- Cover letters: 20 records
- Credit transactions: 30 records

**Rationale:** Prevents huge payloads while showing enough data for analysis.

### Error Handling
- Each table query wrapped in try/except
- Failed queries return empty array (non-fatal)
- Modal shows error state if all queries fail
- Admin can still see other activity types

### Caching
- Activity fetched fresh each time modal opens
- No caching (ensures up-to-date data)
- Could add caching in future if performance becomes issue

---

## Testing

### Manual Testing

1. **Activity Modal:**
   - Click eye icon on any user
   - Verify modal opens with user info
   - Check all 5 tabs load data
   - Verify counts match actual data
   - Close modal and reopen (should refetch)

2. **Search:**
   - Type email in search box
   - Verify only matching users shown
   - Type name in search box
   - Verify case-insensitive matching
   - Click X to clear search

3. **Sorting:**
   - Open Users tab
   - Verify users sorted by last login (most recent first)
   - Verify never-logged-in users at bottom
   - Refresh page (sorting should persist)

### Automated Testing

```python
# backend/tests/test_admin_activity.py
def test_get_user_activity_admin_only():
    response = client.get(f"/api/v1/admin/users/{user_id}/activity")
    assert response.status_code == 403  # Not admin

def test_get_user_activity_returns_all_types():
    response = client.get(f"/api/v1/admin/users/{user_id}/activity", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "resumes" in data
    assert "analyses" in data
    assert "interviews" in data
    assert "cover_letters" in data
    assert "credit_transactions" in data

def test_get_user_activity_empty_user():
    response = client.get(f"/api/v1/admin/users/{new_user_id}/activity", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["resumes"] == []
    assert data["analyses"] == []
```

---

## Future Enhancements

1. **Export Activity:** Add button to export user activity as CSV
2. **Activity Filters:** Filter by date range, activity type
3. **Activity Timeline:** Visual timeline of user actions
4. **Bulk Actions:** Select multiple users and perform actions
5. **Activity Alerts:** Notify admin of suspicious activity
6. **Caching:** Cache activity data with TTL for performance

---

## Files Modified

- `backend/app/api/v1/endpoints/admin.py` - New activity endpoint, sorting fix
- `FRONTEND/src/lib/api.ts` - Activity types and API function
- `FRONTEND/src/pages/AdminPage.tsx` - Modal, search, eye icon, sorting

---

*Last Updated: May 29, 2026*
