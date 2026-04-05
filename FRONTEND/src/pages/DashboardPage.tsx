import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiGetDashboard, type DashboardSummary, type AnalysisHistoryItem } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
    BarChart3, FileText, Loader2, ArrowRight, Zap,
    TrendingUp, CheckCircle2, Clock, AlertTriangle,
    Sparkles, Target, Upload, ChevronDown, Repeat
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

// ── Language Helper ──────────────────────────────────────────────────────────

function detectLanguage(text?: string): "english" | "hinglish" {
    if (!text) return "english";
    const lower = text.toLowerCase();
    const hinglishWords = ["hai", "aur", "mein", "ka", "ke", "ki", "karo", "liye", "bana"];
    let score = 0;
    hinglishWords.forEach(word => {
        if (new RegExp(`\\b${word}\\b`).test(lower)) score++;
    });
    return score >= 2 ? "hinglish" : "english";
}

// ── History Item Component ───────────────────────────────────────────────────

function HistoryItem({
    item,
    isLast
}: {
    item: AnalysisHistoryItem;
    isLast: boolean;
}) {
    const [expanded, setExpanded] = useState(false);

    // Auto-detect the initial language based on the loaded summary
    const initialLang = detectLanguage(item.output_data?.summary);
    const [language, setLanguage] = useState<"english" | "hinglish">(initialLang);
    const [translating, setTranslating] = useState(false);
    const [outputData, setOutputData] = useState(item.output_data);

    // If it's just an ATS score, we generally don't have deep sections to expand
    // But we still allow clicking if we want to add future details.
    const isRoast = item.type === "general_roast";
    const canExpand = isRoast && outputData != null;

    const handleTranslate = async () => {
        if (!canExpand || translating) return;
        setTranslating(true);
        try {
            const targetLang = language === "english" ? "hinglish" : "english";
            // If going back to English, we might just rely on the originally loaded data (which is English)
            // But if we translated it to Hinglish, we might have lost the English data in state,
            // so let's just make the API call to toggle it fully to be safe.
            const { apiTranslateAnalysis } = await import('@/lib/api');
            const data = await apiTranslateAnalysis(item.id, targetLang);
            setOutputData(data);
            setLanguage(targetLang);
        } catch (e) {
            console.error("Translation failed", e);
        } finally {
            setTranslating(false);
        }
    };

    return (
        <div className={`flex flex-col py-4 ${!isLast ? "border-b border-border/10" : ""}`}>
            {/* Header row (always visible) */}
            <div
                className={`flex items-center gap-4 ${canExpand ? "cursor-pointer group" : ""}`}
                onClick={() => canExpand && setExpanded(!expanded)}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${item.type === "general_roast" ? "bg-purple-400/10" : "bg-blue-400/10"}`}
                >
                    {item.type === "general_roast"
                        ? <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        : <Target className="w-3.5 h-3.5 text-blue-400" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground/80 truncate">
                            {item.type === "general_roast" ? "Deep Analysis" : "ATS Score"}
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
                                ? (item.score >= 75 ? "text-emerald-600 border-emerald-600/20 bg-emerald-600/10 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/20"
                                    : item.score >= 50 ? "text-amber-600 border-amber-600/20 bg-amber-600/10 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20"
                                        : "text-red-600 border-red-600/20 bg-red-600/10 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/20")
                                : "text-blue-600 border-blue-600/20 bg-blue-600/10 dark:text-blue-400 dark:bg-blue-400/10 dark:border-blue-400/20"
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

                        {/* Language Toggle Header */}
                        <div className="flex items-center justify-between border-b border-border/10 pb-3">
                            <p className="text-xs font-mono uppercase text-muted-foreground/60">Analysis Details</p>
                            <button
                                onClick={handleTranslate}
                                disabled={translating}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                            >
                                {translating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Repeat className="w-3 h-3 text-muted-foreground" />}
                                {language === "hinglish" ? "Translate to English" : "Translate to Hinglish"}
                            </button>
                        </div>

                        {/* Summary */}
                        {outputData.summary && (
                            <div>
                                <p className="text-xs text-muted-foreground/50 mb-1.5 font-medium">Summary</p>
                                <p className="text-sm text-foreground/80 leading-relaxed">{outputData.summary}</p>
                            </div>
                        )}

                        {/* Section Details - fully expanded */}
                        {outputData.sections && Object.keys(outputData.sections).length > 0 && (
                            <div className="space-y-4">
                                <p className="text-xs text-muted-foreground/50 font-medium border-b border-border/10 pb-1">Detailed Breakdown</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(outputData.sections as Record<string, any>).map(([key, sec]) => {
                                        const grade = sec.score?.toLowerCase() || "";
                                        const color = grade === "excellent" || grade === "very good" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
                                            : grade === "good" ? "text-blue-500 bg-blue-500/10 border-blue-500/15"
                                                : grade === "fair" ? "text-amber-500 bg-amber-500/10 border-amber-500/15"
                                                    : "text-red-500 bg-red-500/10 border-red-500/15";

                                        return (
                                            <div key={key} className="rounded-lg border border-border/20 bg-background/50 p-3 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-semibold text-foreground capitalize">{key}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${color}`}>
                                                        {sec.score}
                                                    </span>
                                                </div>

                                                {sec.feedback && (
                                                    <p className="text-xs text-muted-foreground/80 leading-relaxed text-balance">
                                                        {sec.feedback}
                                                    </p>
                                                )}

                                                {(sec.issues?.length > 0 || sec.missing_keywords?.length > 0) && (
                                                    <div className="mt-2 pt-2 border-t border-border/10 grid grid-cols-1 gap-2">
                                                        {sec.issues?.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] uppercase font-mono text-destructive/80 mb-1">Issues</p>
                                                                <ul className="space-y-1">
                                                                    {sec.issues.map((iss: string, idx: number) => (
                                                                        <li key={idx} className="text-[11px] text-muted-foreground flex gap-1.5"><AlertTriangle className="w-3 h-3 text-destructive/60 flex-shrink-0 mt-0.5" /> {iss}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {sec.missing_keywords?.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] uppercase font-mono text-blue-400/80 mb-1">Missing Keywords</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {sec.missing_keywords.map((kw: string, idx: number) => (
                                                                        <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/10 text-[10px] text-blue-500/80">
                                                                            {kw}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Action Items */}
                        {outputData.action_items && outputData.action_items.length > 0 && (
                            <div>
                                <p className="text-xs text-muted-foreground/50 mb-2 font-medium">Top Priority Items</p>
                                <ul className="space-y-1.5">
                                    {outputData.action_items.slice(0, 3).map((item: string, i: number) => (
                                        <li key={i} className="flex gap-2 text-sm text-muted-foreground/80">
                                            <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

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

    // Auth gate: redirect if not logged in
    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    // Fetch dashboard data
    useEffect(() => {
        if (!auth.isAuthenticated) return;
        setLoading(true);
        apiGetDashboard()
            .then((d) => { setData(d); setError(""); })
            .catch((e) => setError(e.message || "Failed to load dashboard"))
            .finally(() => setLoading(false));
    }, [auth.isAuthenticated]);

    const hasAnalyzed = data && data.total_analyses > 0;
    const atsScore = data?.latest_ats_score;
    // We store roast in state to allow translating it directly
    const [roastData, setRoastData] = useState<any>(null);
    const [roastLang, setRoastLang] = useState<"english" | "hinglish">("english");
    const [isTranslatingRoast, setIsTranslatingRoast] = useState(false);

    // Initialize roast data when dashboard data loads
    useEffect(() => {
        if (data?.latest_roast) {
            setRoastData(data.latest_roast);
            setRoastLang(detectLanguage(data.latest_roast.summary));
        }
    }, [data]);

    const handleTranslateDashboardRoast = async () => {
        if (!roastData || !data?.analysis_history?.[0]?.id || isTranslatingRoast) return;
        setIsTranslatingRoast(true);
        try {
            const targetLang = roastLang === "english" ? "hinglish" : "english";
            const { apiTranslateAnalysis } = await import('@/lib/api');
            // Assuming latest roast is the very first item in analysis_history
            const translated = await apiTranslateAnalysis(data.analysis_history[0].id, targetLang);
            setRoastData(translated);
            setRoastLang(targetLang);
        } catch (e) {
            console.error("Dashboard translation failed", e);
        } finally {
            setIsTranslatingRoast(false);
        }
    };

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
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <p className="text-xs font-mono uppercase tracking-widest text-amber-400/80">System Insight</p>
                                    </div>
                                    {hasAnalyzed && roastData && (
                                        <button
                                            onClick={handleTranslateDashboardRoast}
                                            disabled={isTranslatingRoast}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-secondary rounded-full text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
                                        >
                                            {isTranslatingRoast ? <Loader2 className="w-3 h-3 animate-spin" /> : <Repeat className="w-3 h-3 text-muted-foreground" />}
                                            {roastLang === "hinglish" ? "Translate to English" : "Translate to Hinglish"}
                                        </button>
                                    )}
                                </div>
                                <div className="px-6 pb-6 pt-4">
                                    {hasAnalyzed && roastData ? (
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground mb-2">
                                                Your biggest unlock right now:
                                            </h2>
                                            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
                                                {roastData.summary}
                                            </p>
                                            {roastData.action_items?.[0] && (
                                                <div className="mt-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                                                    <p className="text-sm text-foreground/80">{roastData.action_items[0]}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-secondary/40 flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-muted-foreground/40" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground/70">No resume analyzed yet</p>
                                                    <p className="text-xs text-muted-foreground/50">Upload your resume to unlock insights</p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/resume-analysis"
                                                className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                Analyze Resume
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SECTION 2: User Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label="Resume Score"
                                    value={atsScore != null ? `${atsScore}` : "--"}
                                    subtext={atsScore != null ? (atsScore >= 75 ? "Strong match" : atsScore >= 50 ? "Moderate fit" : "Needs work") : "Run ATS scoring"}
                                    icon={Target}
                                    color={atsScore != null ? (atsScore >= 75 ? "text-emerald-600 dark:text-emerald-400" : atsScore >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400") : "text-muted-foreground"}
                                />
                                <MetricCard
                                    label="Overall Grade"
                                    value={roastData?.overall_feedback ?? "--"}
                                    subtext={roastData ? "Based on deep analysis" : "Run deep analysis"}
                                    icon={BarChart3}
                                    color={roastData ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
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

                            {/* SECTION 4: Improvement Tracker (only if roast exists) */}
                            {hasAnalyzed && roastData && (roastData.action_items?.length > 1 || Object.keys(roastData.sections || {}).length > 0) && (
                                <div className="rounded-xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-border/15">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Improvement Tracker</p>
                                        </div>
                                    </div>
                                    <div className="px-6 py-4 space-y-4">
                                        {/* Section grades */}
                                        {Object.keys(roastData.sections || {}).length > 0 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground/50 mb-3">Section Breakdown</p>
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                    {Object.entries(roastData.sections).map(([key, sec]: [string, any]) => {
                                                        const grade = sec.score?.toLowerCase() || "";
                                                        const color =
                                                            grade === "excellent" || grade === "very good" ? "text-emerald-600 bg-emerald-600/10 border-emerald-600/15 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/15"
                                                                : grade === "good" ? "text-blue-600 bg-blue-600/10 border-blue-600/15 dark:text-blue-400 dark:bg-blue-400/10 dark:border-blue-400/15"
                                                                    : grade === "fair" ? "text-amber-600 bg-amber-600/10 border-amber-600/15 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/15"
                                                                        : "text-red-600 bg-red-600/10 border-red-600/15 dark:text-red-400 dark:bg-red-400/10 dark:border-red-400/15";

                                                        return (
                                                            <div key={key} className={`rounded-lg border p-3 text-center ${color}`}>
                                                                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider mb-1 capitalize">{key}</p>
                                                                <p className="text-sm font-semibold">{sec.score}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action items */}
                                        {roastData.action_items?.length > 1 && (
                                            <div>
                                                <p className="text-xs text-muted-foreground/50 mb-3">Top Improvement Areas</p>
                                                <ol className="space-y-2.5">
                                                    {roastData.action_items.slice(0, 5).map((item: string, i: number) => (
                                                        <li key={i} className="flex gap-3 text-sm text-muted-foreground/70 leading-relaxed">
                                                            <span className="font-mono text-xs text-foreground/20 flex-shrink-0 mt-0.5 w-5 text-right">
                                                                {String(i + 1).padStart(2, "0")}
                                                            </span>
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DashboardPage;
