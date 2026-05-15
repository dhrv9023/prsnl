import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiGetDashboard, apiGetInterviewHistory, type DashboardSummary, type AnalysisHistoryItem, type HiringIntelResponse, type DeepAnalysisResult, type InterviewHistoryItem } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CreditCard } from "@/components/ui/CreditDisplay";
import { HinglishToggle } from "@/components/ui/HinglishToggle";
import {
    BarChart3, FileText, Loader2, ArrowRight, Zap,
    TrendingUp, CheckCircle2, Clock, AlertTriangle,
    Sparkles, Target, Upload, ChevronDown, Brain, Layers, Mic2, MessageSquare
} from "lucide-react";

// ── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonCard({ className = "" }: { className?: string }) {
    return (
        <div className={`rounded-xl border border-border/20 bg-card/50 p-6 animate-pulse ${className}`}>
            <div className="h-3 w-24 bg-border/20 rounded mb-4" />
            <div className="h-8 w-16 bg-border/20 rounded mb-2" />
            <div className="h-3 w-32 bg-border/15 rounded" />
        </div>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-4 py-4 border-b border-border/10 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-border/15" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-40 bg-border/20 rounded" />
                <div className="h-2.5 w-24 bg-border/15 rounded" />
            </div>
            <div className="h-6 w-16 bg-border/15 rounded-full" />
        </div>
    );
}

// ── Time ago helper ──────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

// ── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
    label,
    value,
    subtext,
    icon: Icon,
    color = "text-foreground",
}: {
    label: string;
    value: string | number;
    subtext?: string;
    icon: React.ElementType;
    color?: string;
}) {
    return (
        <div className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm p-5 hover:border-border/40 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center group-hover:bg-secondary/60 transition-colors">
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${value === "--" ? "text-muted-foreground/50" : color}`}>
                {value}
            </p>
            {subtext && (
                <p className="text-xs text-muted-foreground/50 mt-1.5">{subtext}</p>
            )}
        </div>
    );
}

// No language helper needed anymore

// ── InsightWithHinglish ──────────────────────────────────────────────────────

function InsightWithHinglish({
    insightTitle,
    insightSummary,
    intelData,
    deepData,
}: {
    insightTitle: string | null;
    insightSummary: string;
    intelData: HiringIntelResponse | null;
    deepData: DeepAnalysisResult | null;
}) {
    const [displayText, setDisplayText] = useState(insightSummary);

    return (
        <div>
            <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-lg font-semibold text-foreground">{insightTitle}</h2>
                <HinglishToggle
                    originalText={insightSummary}
                    onConverted={setDisplayText}
                    label="Hinglish mein"
                />
            </div>
            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">{displayText}</p>
            {intelData?.report.highest_impact_improvements.length && (
                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80">
                        <strong className="text-foreground">Top priority:</strong> {intelData.report.highest_impact_improvements[0].improvement}
                    </p>
                </div>
            )}
            {!intelData && deepData?.action_items?.[0] && (
                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/80">{deepData.action_items[0]}</p>
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function HistoryItem({
    item,
    isLast
}: {
    item: AnalysisHistoryItem;
    isLast: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const outputData = item.output_data as HiringIntelResponse | DeepAnalysisResult | { score: number; mode?: string } | null;

    const isIntel = item.type === "hiring_intel";
    const isDeep = item.type === "deep_analysis";
    const isATS = item.type === "job_match_score";
    const canExpand = (isIntel || isDeep) && outputData != null;

    // Extract ATS mode from output_data
    const atsMode = isATS && outputData && "mode" in outputData ? outputData.mode : null;
    const atsLabel = isATS 
        ? (atsMode === "jd" ? "ATS Score (with JD)" : "ATS Score (without JD)")
        : isIntel 
            ? "Hiring Intelligence" 
            : "Deep Analysis";

    return (
        <div className={`flex flex-col py-4 ${!isLast ? "border-b border-border/10" : ""}`}>
            {/* Header row */}
            <div
                className={`flex items-center gap-4 ${canExpand ? "cursor-pointer group" : ""}`}
                onClick={() => canExpand && setExpanded(!expanded)}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isIntel ? "bg-purple-400/10" : isDeep ? "bg-blue-400/10" : "bg-emerald-400/10"}`}
                >
                    {isIntel
                        ? <Brain className="w-3.5 h-3.5 text-purple-400" />
                        : isDeep
                        ? <Layers className="w-3.5 h-3.5 text-blue-400" />
                        : <Target className="w-3.5 h-3.5 text-emerald-400" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground/80 truncate">
                            {atsLabel}
                        </p>
                        {item.resume_name && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground truncate max-w-[150px] md:max-w-xs">
                                {item.resume_name}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground/40 mt-0.5">{timeAgo(item.created_at)}</p>
                </div>

                <div className="flex items-center gap-3">
                    {item.score != null && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border
                            ${typeof item.score === "number"
                                ? (item.score >= 75 ? "text-emerald-600 border-emerald-600/20 bg-emerald-600/10"
                                    : item.score >= 50 ? "text-amber-600 border-amber-600/20 bg-amber-600/10"
                                        : "text-red-600 border-red-600/20 bg-red-600/10")
                                : "text-blue-600 border-blue-600/20 bg-blue-600/10"
                            }`}
                        >
                            {typeof item.score === "number" ? `${item.score}/100` : item.score}
                        </span>
                    )}
                    {canExpand && (
                        <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-200 group-hover:text-muted-foreground ${expanded ? "rotate-180" : ""}`} />
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && canExpand && outputData && (
                <div className="mt-4 pl-12 pr-2 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="rounded-xl border border-border/20 bg-secondary/10 p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-border/10 pb-3">
                            <p className="text-xs font-mono uppercase text-muted-foreground/60">
                                {isIntel ? "Intelligence Overview" : "Deep Analysis Overview"}
                            </p>
                        </div>

                        {/* Hiring Intel expanded */}
                        {isIntel && "report" in outputData && (
                            <>
                                <div>
                                    <p className="text-xs text-muted-foreground/50 mb-1.5 font-medium">Verdict</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{(outputData as HiringIntelResponse).report.final_verdict.summary}</p>
                                </div>
                                {(outputData as HiringIntelResponse).report.highest_impact_improvements.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground/50 mb-2 font-medium">Top Priority Improvements</p>
                                        <ul className="space-y-2">
                                            {(outputData as HiringIntelResponse).report.highest_impact_improvements.slice(0, 3).map((imp, i) => (
                                                <li key={i} className="flex gap-2 text-sm text-muted-foreground/80 leading-relaxed">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                    <span><strong className="text-foreground/70">{imp.improvement}:</strong> {imp.why}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Deep Analysis expanded */}
                        {isDeep && "summary" in outputData && (
                            <>
                                <div>
                                    <p className="text-xs text-muted-foreground/50 mb-1.5 font-medium">Summary</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{(outputData as DeepAnalysisResult).summary}</p>
                                </div>
                                {(outputData as DeepAnalysisResult).action_items?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground/50 mb-2 font-medium">Top Action Items</p>
                                        <ul className="space-y-2">
                                            {(outputData as DeepAnalysisResult).action_items.slice(0, 3).map((item, i) => (
                                                <li key={i} className="flex gap-2 text-sm text-muted-foreground/80 leading-relaxed">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="pt-2 text-right">
                            <Link to="/resume-analysis" className="text-xs text-primary/80 hover:text-primary transition-colors">Run full analysis →</Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const DashboardPage = () => {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [interviews, setInterviews] = useState<InterviewHistoryItem[]>([]);

    // Auth gate: redirect if not logged in
    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    // Fetch dashboard data + interview history
    useEffect(() => {
        if (!auth.isAuthenticated) return;
        setLoading(true);
        Promise.all([
            apiGetDashboard(),
            apiGetInterviewHistory().catch(() => [] as InterviewHistoryItem[]),
        ])
            .then(([d, hist]) => { setData(d); setInterviews(hist); setError(""); })
            .catch((e) => setError(e.message || "Failed to load dashboard"))
            .finally(() => setLoading(false));
    }, [auth.isAuthenticated]);

    const hasAnalyzed = data && data.total_analyses > 0;
    const atsScore = data?.latest_ats_score;
    const atsMode = data?.latest_ats_mode;
    const intelData = data?.latest_intel;
    const deepData = data?.latest_deep_analysis;
    // Show intel if available, else fall back to deep analysis summary
    const insightSummary = intelData?.report?.final_verdict?.summary ?? deepData?.summary ?? null;
    const insightTitle = intelData ? "Your latest hiring verdict:" : deepData ? "Deep resume analysis:" : null;

    // Don't render until auth check completes
    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="pt-24 pb-16">
                <div className="container max-w-6xl">

                    {/* ── Header ───────────────────────────────────────────────── */}
                    <div className="mb-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                                <p className="text-sm text-muted-foreground/60">
                                    {hasAnalyzed
                                        ? "Your career intelligence at a glance"
                                        : "Welcome to Kareerist"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Error state ──────────────────────────────────────────── */}
                    {error && (
                        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-destructive">Failed to load data</p>
                                <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Loading state ────────────────────────────────────────── */}
                    {loading && (
                        <div className="space-y-6">
                            <div className="rounded-xl border border-border/20 bg-card/50 p-6 animate-pulse">
                                <div className="h-3 w-32 bg-border/20 rounded mb-3" />
                                <div className="h-5 w-3/4 bg-border/15 rounded mb-2" />
                                <div className="h-4 w-1/2 bg-border/10 rounded" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
                            </div>
                            <div className="rounded-xl border border-border/20 bg-card/50 p-6">
                                {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
                            </div>
                        </div>
                    )}

                    {/* ── Content (after loading) ──────────────────────────────── */}
                    {!loading && !error && data && (
                        <div className="space-y-6">

                            {/* SECTION 1: System Insight Panel */}
                            <div className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
                                <div className="px-6 py-4 flex items-center justify-between border-b border-border/15">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <p className="text-xs font-mono uppercase tracking-widest text-primary/80">Career Intelligence</p>
                                    </div>
                                </div>
                                <div className="px-6 pb-6 pt-4">
                                    {hasAnalyzed && insightSummary ? (
                                        <InsightWithHinglish
                                            insightTitle={insightTitle}
                                            insightSummary={insightSummary}
                                            intelData={intelData ?? null}
                                            deepData={deepData ?? null}
                                        />
                                    ) : (
                                        <div className="py-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-muted-foreground/40" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground/70">No insights yet</p>
                                                    <p className="text-xs text-muted-foreground/50">Run Deep Analysis or Hiring Intel to unlock</p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/resume-analysis"
                                                className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                                            >
                                                <Brain className="w-3.5 h-3.5" />
                                                Analyze Resume
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: User Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label={atsMode === "jd_match" ? "ATS Score (with JD)" : "ATS Score (without JD)"}
                                    value={atsScore != null ? `${atsScore}` : "--"}
                                    subtext={atsScore != null ? (atsScore >= 75 ? "Strong match" : atsScore >= 50 ? "Moderate fit" : "Needs work") : "Run ATS scoring"}
                                    icon={Target}
                                    color={atsScore != null ? (atsScore >= 75 ? "text-emerald-600 dark:text-emerald-400" : atsScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400") : "text-muted-foreground"}
                                />
                                <MetricCard
                                    label="Readiness"
                                    value={intelData?.report?.final_verdict?.hiring_readiness ?? deepData?.overall_feedback ?? "--"}
                                    subtext={intelData ? "Based on hiring intel" : deepData ? "Based on deep analysis" : "Run analysis"}
                                    icon={BarChart3}
                                    color={(intelData || deepData) ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                                />
                                <MetricCard
                                    label="Resumes"
                                    value={data.total_resumes || "--"}
                                    subtext={data.total_resumes > 0 ? `${data.total_resumes} uploaded` : "Upload a resume"}
                                    icon={FileText}
                                    color={data.total_resumes > 0 ? "text-foreground" : "text-muted-foreground"}
                                />
                                <MetricCard
                                    label="Analyses"
                                    value={data.total_analyses || "--"}
                                    subtext={data.total_analyses > 0 ? `${data.total_analyses} completed` : "No analyses yet"}
                                    icon={TrendingUp}
                                    color={data.total_analyses > 0 ? "text-foreground" : "text-muted-foreground"}
                                />
                            </div>

                            {/* SECTION 2b: Credits + Interview History */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <CreditCard />
                                {/* Interview History */}
                                <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-border/15 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mic2 className="w-3.5 h-3.5 text-muted-foreground/50" />
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Interview History</p>
                                        </div>
                                        {interviews.length > 3 && (
                                            <Link to="/interview/history" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
                                                View all →
                                            </Link>
                                        )}
                                    </div>
                                    <div className="divide-y divide-border/10">
                                        {interviews.length > 0 ? (
                                            interviews.slice(0, 4).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground/80 truncate">
                                                            {item.role?.replace(/^\[ROAST\]/, "").replace(/\[LANG:[^\]]+\]/, "").trim() || "Mock Interview"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground/40 mt-0.5">{timeAgo(item.created_at)}</p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                                        item.overall_score >= 7 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-600/25"
                                                        : item.overall_score >= 5 ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-600/25"
                                                        : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-600/25"
                                                    }`}>
                                                        {item.overall_score.toFixed(1)}/10
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-5 py-6 text-center">
                                                <p className="text-sm text-muted-foreground/50">No interviews yet</p>
                                                <Link to="/interview" className="text-xs text-primary/70 hover:text-primary mt-1 inline-block">Start your first →</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Analysis History */}
                            <div className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
                                <div className="px-6 py-4 flex items-center justify-between border-b border-border/15">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground/50" />
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Analysis History</p>
                                    </div>
                                    {data.analysis_history.length > 0 && (
                                        <Link
                                            to="/resume-analysis"
                                            className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
                                        >
                                            New Analysis <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    )}
                                </div>
                                <div className="px-6">
                                    {data.analysis_history.length > 0 ? (
                                        data.analysis_history.slice(0, 10).map((item, i) => (
                                            <HistoryItem
                                                key={item.id}
                                                item={item}
                                                isLast={i === Math.min(data.analysis_history.length, 10) - 1}
                                            />
                                        ))
                                    ) : (
                                        <div className="py-10 text-center">
                                            <p className="text-sm text-muted-foreground/50">No analyses yet</p>
                                            <p className="text-xs text-muted-foreground/30 mt-1">Upload your first resume to begin</p>
                                            <Link
                                                to="/resume-analysis"
                                                className="inline-flex items-center gap-2 mt-4 h-9 px-4 bg-secondary border border-border/30 text-foreground rounded-lg text-sm font-medium hover:bg-secondary/70 transition-colors"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                Start Analyzing
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 4: Improvement Tracker (intel or deep) */}
                            {hasAnalyzed && (intelData || deepData) && (
                                <div className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-border/15">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Improvement Tracker</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 space-y-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground/50 mb-3">Top Improvement Areas</p>
                                            <ol className="space-y-2.5">
                                                {intelData ? (
                                                    intelData.report.highest_impact_improvements.slice(0, 5).map((item, i) => (
                                                        <li key={i} className="flex gap-3 text-sm text-muted-foreground/70 leading-relaxed">
                                                            <span className="font-mono text-xs text-foreground/20 flex-shrink-0 mt-0.5 w-5 text-right">
                                                                {String(i + 1).padStart(2, "0")}
                                                            </span>
                                                            <span><strong className="text-foreground/80">{item.improvement}:</strong> {item.why}</span>
                                                        </li>
                                                    ))
                                                ) : deepData?.action_items?.slice(0, 5).map((item, i) => (
                                                    <li key={i} className="flex gap-3 text-sm text-muted-foreground/70 leading-relaxed">
                                                        <span className="font-mono text-xs text-foreground/20 flex-shrink-0 mt-0.5 w-5 text-right">
                                                            {String(i + 1).padStart(2, "0")}
                                                        </span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* Feedback CTA */}
                    {!loading && !error && data && (
                        <div className="mt-8 rounded-xl border border-border/20 bg-secondary/20 p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <MessageSquare className="w-5 h-5 text-primary/60 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-foreground/80">Help us improve Kareerist</p>
                                    <p className="text-xs text-muted-foreground/50">Takes 2 minutes — your feedback shapes what we build next</p>
                                </div>
                            </div>
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSf0cFl_6uiYMP7iadg8EgSXz-x69usj5AcGy3kmduyl5I7mBA/viewform"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                            >
                                Give Feedback
                            </a>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DashboardPage;
