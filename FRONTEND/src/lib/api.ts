// ─────────────────────────────────────────────────────────────────────────────
// Centralized API client for Kareerist Studio
//
// All requests go through the Vite proxy  →  /api  →  http://localhost:8000
// HttpOnly cookies are sent automatically because of "credentials: include"
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "/api/v1";

// ── Generic fetch wrapper ────────────────────────────────────────────────────

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: "include", // always send the HttpOnly cookie
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            detail = body?.detail ?? detail;
        } catch {
            // ignore parse failure
        }
        throw new Error(detail);
    }

    return res.json() as Promise<T>;
}

// ── Auth types ───────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    email: string;
}

export interface AuthMeResponse extends AuthUser {
    msg: string;
}

// ── Auth endpoints ───────────────────────────────────────────────────────────

export async function apiSignup(
    email: string,
    password: string,
    full_name?: string
): Promise<{ msg: string; user_id?: string }> {
    return request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name }),
    });
}

export async function apiLogin(
    email: string,
    password: string
): Promise<{ msg: string; user: AuthUser }> {
    return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function apiLogout(): Promise<{ msg: string }> {
    return request("/auth/logout", { method: "POST" });
}

export async function apiGetMe(): Promise<AuthMeResponse> {
    return request("/auth/me");
}

// ── Resume types ─────────────────────────────────────────────────────────────

export interface UploadResumeResponse {
    msg: string;
    id: string;
    extracted_length: number;
}

// ── Resume endpoints ─────────────────────────────────────────────────────────

export async function apiUploadResume(
    file: File
): Promise<UploadResumeResponse> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${BASE}/resumes/upload`, {
        method: "POST",
        credentials: "include",
        body: form,
        // ⚠️ Do NOT set Content-Type here — browser sets it with correct boundary
    });

    if (!res.ok) {
        let detail = `Upload failed (HTTP ${res.status})`;
        try {
            const body = await res.json();
            detail = body?.detail ?? detail;
        } catch {
            //
        }
        throw new Error(detail);
    }

    return res.json();
}

// ── Analysis types ────────────────────────────────────────────────────────────

export interface MatchResult {
    score: number;
    raw_similarity: number;
    warning?: string;
}

export interface RoastSection {
    score: string;
    feedback: string;
    issues?: string;
    missing_keywords?: string;
}

export interface RoastDetails {
    overall_feedback: string;
    summary: string;
    sections: Record<string, RoastSection>;
    action_items: string[];
}

export interface RoastResponse {
    ats_math_score: number;
    roast_details: RoastDetails;
}

// ── Analysis endpoints ────────────────────────────────────────────────────────

export async function apiGetAtsScore(
    resume_id: string,
    job_description: string
): Promise<MatchResult> {
    return request("/analysis/match", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description }),
    });
}

export async function apiGetRoast(
    resume_id: string,
    job_description: string,
    language: string = "english"
): Promise<RoastResponse> {
    return request("/analysis/roast", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description, language }),
    });
}

export async function apiTranslateAnalysis(
    analysis_id: string,
    language: string = "hinglish"
): Promise<any> {
    return request(`/analysis/${analysis_id}/translate`, {
        method: "POST",
        body: JSON.stringify({ language }),
    });
}

// ── Cover Letter types ────────────────────────────────────────────────────────

export interface CoverLetterResponse {
    msg: string;
    application_id: string;
    content: string;
}

export interface SavePdfResponse {
    msg: string;
    pdf_url: string;
}

// ── Cover Letter endpoints ───────────────────────────────────────────────────

export async function apiGenerateCoverLetter(
    resume_id: string,
    job_description: string,
    company_name: string,
    job_title: string
): Promise<CoverLetterResponse> {
    return request("/cover_letter/generate", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description, company_name, job_title }),
    });
}

export async function apiSaveCoverLetterPdf(
    application_id: string,
    final_text: string
): Promise<SavePdfResponse> {
    return request("/cover_letter/save_pdf", {
        method: "POST",
        body: JSON.stringify({ application_id, final_text }),
    });
}

// ── Dashboard types ──────────────────────────────────────────────────────────

export interface AnalysisHistoryItem {
    id: string;
    resume_id: string;
    resume_name?: string;
    type: string;           // "job_match_score" | "general_roast"
    score: number | string | null;
    created_at: string;
    output_data?: any;      // The full JSON result (e.g. sections, action_items)
}

export interface DashboardSummary {
    total_resumes: number;
    total_analyses: number;
    latest_ats_score: number | null;
    latest_roast: RoastDetails | null;
    analysis_history: AnalysisHistoryItem[];
}

// ── Dashboard endpoints ──────────────────────────────────────────────────────

export async function apiGetDashboard(): Promise<DashboardSummary> {
    return request("/dashboard/summary");
}
