// ─────────────────────────────────────────────────────────────────────────────
// Centralized API client for Kareerist Studio
//
// In development: Vite proxy forwards /api → http://localhost:8000
// In production: VITE_API_BASE points to the deployed backend URL
// HttpOnly cookies are sent automatically because of "credentials: include"
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const BASE = `${API_BASE}/api/v1`;

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
    is_admin?: boolean;
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

export async function apiExchangeOAuthSession(
    code: string,
    code_verifier: string
): Promise<{ msg: string; user: AuthUser }> {
    return request("/auth/oauth/session", {
        method: "POST",
        body: JSON.stringify({ code, code_verifier }),
    });
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
    raw_similarity: number | null;
    warning?: string;
    mode?: "general" | "jd_match";
    note?: string;
    breakdown?: {
        content_density: number;
        quantification: number;
        action_verbs: number;
        section_coverage: number;
        contact_info: number;
        formatting: number;
    };
}

// ── Hiring Intelligence types ─────────────────────────────────────────────────

export interface HiringIntelVerdict {
    shortlist_probability: "Low" | "Medium" | "High";
    perceived_readiness: string;
    competitiveness: string;
}

export interface HiringIntelCriticalSkill {
    skill: string;
    why_it_matters: string;
    hiring_impact: string;
}

export interface HiringIntelOptionalSkill {
    skill: string;
    why_it_matters: string;
}

export interface HiringIntelImprovement {
    improvement: string;
    why: string;
    hiring_impact: string;
}

export interface HiringIntelRewrite {
    original: string;
    improved: string;
    reason: string;
}

export interface HiringIntelReport {
    overall_alignment: string;
    recruiter_pov: {
        first_impression: string;
        strong_signals: string[];
        recruiter_concerns: string[];
        verdict: HiringIntelVerdict;
    };
    skill_gap: {
        critical_missing: HiringIntelCriticalSkill[];
        optional_missing: HiringIntelOptionalSkill[];
        production_gaps: string[];
    };
    deep_hiring_analysis: {
        engineering_maturity: string;
        execution_capability: string;
        project_credibility: string;
        production_readiness: string;
    };
    role_aware_reasoning: {
        what_recruiters_prioritize: string;
        candidate_alignment: string;
        role_specific_strengths: string[];
        role_specific_weaknesses: string[];
    };
    why_this_matters: { gap: string; explanation: string }[];
    highest_impact_improvements: HiringIntelImprovement[];
    before_after_rewrites: HiringIntelRewrite[];
    final_verdict: {
        hiring_readiness: "Not Ready" | "Borderline" | "Interview-Ready" | "Strong Candidate";
        summary: string;
    };
}

export interface HiringIntelResponse {
    ats_score: number;
    target_role: string;
    experience_level: string;
    report: HiringIntelReport;
}

// ── Deep Analysis types ─────────────────────────────────────────────────────

export interface DeepAnalysisSection {
    score: "Excellent" | "Very Good" | "Good" | "Fair" | "Poor";
    feedback: string;
    issues: string[];
    missing_keywords: string[];
}

export interface DeepAnalysisResult {
    summary: string;
    overall_feedback: "Excellent" | "Good" | "Fair" | "Poor";
    sections: Record<string, DeepAnalysisSection>;
    action_items: string[];
    jd_provided?: boolean;
}

// ── Analysis endpoints ─────────────────────────────────────────────────────

export async function apiGetAtsScore(
    resume_id: string,
    job_description?: string
): Promise<MatchResult> {
    return request("/analysis/match", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description: job_description || null }),
    });
}

export async function apiGetDeepAnalysis(
    resume_id: string,
    job_description?: string
): Promise<DeepAnalysisResult> {
    return request("/analysis/deep", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description: job_description || null }),
    });
}

export async function apiGetHiringIntel(
    resume_id: string,
    job_description: string,
    target_role: string,
    experience_level: string
): Promise<HiringIntelResponse> {
    return request("/analysis/hiring-intel", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description, target_role, experience_level }),
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

export async function apiGenerateRoastCoverLetter(
    resume_id: string,
    job_description: string,
    company_name: string,
    job_title: string,
    language: string = "english"
): Promise<CoverLetterResponse> {
    return request("/cover_letter/generate-roast", {
        method: "POST",
        body: JSON.stringify({ resume_id, job_description, company_name, job_title, language }),
    });
}

export async function apiHumanizeCoverLetter(
    text: string
): Promise<{ humanized_text: string }> {
    return request("/cover_letter/humanize", {
        method: "POST",
        body: JSON.stringify({ text }),
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
    type: string;           // "job_match_score" | "hiring_intel"
    score: number | string | null;
    created_at: string;
    output_data?: unknown;      // The full JSON result
}

export interface DashboardSummary {
    total_resumes: number;
    total_analyses: number;
    latest_ats_score: number | null;
    latest_ats_mode: "general" | "jd_match" | null;
    latest_intel: HiringIntelResponse | null;
    latest_deep_analysis: DeepAnalysisResult | null;
    analysis_history: AnalysisHistoryItem[];
}

// ── Dashboard endpoints ──────────────────────────────────────────────────────

export async function apiGetDashboard(): Promise<DashboardSummary> {
    return request("/dashboard/summary");
}

// ── Resume list (for interview setup) ────────────────────────────────────────

export interface ResumeListItem {
    id: string;
    file_url: string;
    resume_quality_feedback: number;
    created_at: string;
}

export async function apiListResumes(): Promise<ResumeListItem[]> {
    return request("/resumes/");
}

// ── Interview types ──────────────────────────────────────────────────────────

export interface InterviewQuestion {
    id: number;
    type: "theory" | "mcq" | "code";
    text: string;
    options?: string[];
    context?: string;
}

export interface AnswerEvaluation {
    score: number;
    feedback: string;
    ideal_answer: string;
    time_complexity?: string;
    space_complexity?: string;
    code_quality?: string;
}

export interface InterviewBreakdownItem {
    question: string;
    type: string;
    user_answer: string;
    score: number;
    feedback: string;
    ideal_answer: string;
    tc?: string;
    sc?: string;
    quality?: string;
}

export interface InterviewReport {
    overall_score: number;
    qualitative_score?: string;
    breakdown: InterviewBreakdownItem[];
}

// ── Interview endpoints ───────────────────────────────────────────────────────
// NOTE: The interview router is mounted at /api/v1/interview directly in main.py

const INTERVIEW_BASE = `${API_BASE}/api/v1/interview`;

async function interviewRequest<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${INTERVIEW_BASE}${path}`, {
        ...options,
        credentials: "include",
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
        } catch { /* ignore */ }
        throw new Error(detail);
    }

    return res.json() as Promise<T>;
}

export async function apiStartInterview(
    resume_id: string,
    role: string,
    experience_level: string,
    roast_mode: boolean = false,
    language: string = "english"
): Promise<InterviewQuestion[]> {
    return interviewRequest("/start", {
        method: "POST",
        body: JSON.stringify({ resume_id, role, experience_level, roast_mode, language }),
    });
}

export async function apiSubmitAnswer(
    question_id: number,
    user_answer: string | null
): Promise<AnswerEvaluation> {
    return interviewRequest("/submit", {
        method: "POST",
        body: JSON.stringify({ question_id, user_answer }),
    });
}

export async function apiEndInterview(): Promise<InterviewReport> {
    return interviewRequest("/end", { method: "POST" });
}

// ── Admin types ───────────────────────────────────────────────────────────────

export interface AdminStats {
    total_users: number;
    new_users_7d: number;
    total_resumes: number;
    total_analyses: number;
    total_cover_letters: number;
    total_interviews: number;
    analysis_type_breakdown: Record<string, number>;
    recent_activity: { analysis_type: string; created_at: string }[];
    credit_stats: {
        total_credits_granted: number;
        total_credits_used: number;
        per_feature_usage: Record<string, number>;
    };
    feature_costs: Record<string, number>;
}

export interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    remaining_credits: number;
    total_credits_granted: number;
    credits_used: number;
    is_unlimited: boolean;
    is_admin: boolean;
    created_at: string;
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export async function apiGetAdminStats(): Promise<AdminStats> {
    return request("/admin/stats");
}

export async function apiGetAdminUsers(): Promise<AdminUser[]> {
    return request("/admin/users");
}

export async function apiGrantCredits(
    userId: string,
    amount: number,
    reason?: string
): Promise<{ msg: string; remaining: number; total_granted: number }> {
    return request(`/admin/users/${userId}/grant-credits`, {
        method: "POST",
        body: JSON.stringify({ amount, reason: reason ?? "admin_grant" }),
    });
}

export async function apiSetUnlimited(
    userId: string,
    unlimited: boolean
): Promise<{ msg: string; is_unlimited: boolean }> {
    return request(`/admin/users/${userId}/set-unlimited`, {
        method: "POST",
        body: JSON.stringify({ unlimited }),
    });
}

export async function apiGetUserCreditHistory(userId: string): Promise<CreditTransaction[]> {
    return request(`/admin/users/${userId}/credit-history`);
}

// ── Credit types ──────────────────────────────────────────────────────────────

export interface CreditBalance {
    remaining: number;
    total_granted: number;
    used: number;
    is_unlimited: boolean;
    low_credits: boolean;
}

export interface CreditTransaction {
    id: string;
    feature: string;
    label: string;
    credits_used: number;
    credits_before: number;
    credits_after: number;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface FeatureCost {
    cost: number;
    label: string;
}

export interface CreditValidation {
    can_use: boolean;
    remaining: number;
    cost: number;
    shortfall: number;
    is_unlimited?: boolean;
}

// ── Credit endpoints ──────────────────────────────────────────────────────────

export async function apiGetCreditBalance(): Promise<CreditBalance> {
    return request("/credits/balance");
}

export async function apiGetFeatureCosts(): Promise<Record<string, FeatureCost>> {
    return request("/credits/costs");
}

export async function apiValidateCredits(feature: string): Promise<CreditValidation> {
    return request("/credits/validate", {
        method: "POST",
        body: JSON.stringify({ feature }),
    });
}

export async function apiGetCreditHistory(): Promise<CreditTransaction[]> {
    return request("/credits/history");
}

// ── Interview History types ───────────────────────────────────────────────────

export interface InterviewHistoryItem {
    id: string;
    overall_score: number;
    qualitative_score: string | null;
    breakdown: InterviewBreakdownItem[];
    role: string | null;
    experience_level: string | null;
    questions_count: number;
    answers_count: number;
    created_at: string;
}

// ── Interview History endpoint ────────────────────────────────────────────────

export async function apiGetInterviewHistory(): Promise<InterviewHistoryItem[]> {
    return request("/interview/history");
}

export async function apiGetActiveInterviewSession(): Promise<{
    active: boolean;
    questions: InterviewQuestion[] | null;
    answered_count: number;
    total_questions?: number;
    role: string | null;
    experience_level?: string | null;
}> {
    return interviewRequest("/session");
}
