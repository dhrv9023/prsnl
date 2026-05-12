import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiGetInterviewHistory, type InterviewHistoryItem, type InterviewBreakdownItem } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/layout/Navbar";
import {
    Mic2, ArrowLeft, Loader2, AlertTriangle, ChevronDown, ChevronUp,
    Trophy, Target, Code2, BookOpen, CheckCircle2, XCircle, Clock,
    BarChart3, Sparkles,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });
}

function formatRole(raw: string | null): string {
    if (!raw) return "Unknown Role";
    // Strip encoding prefixes like [ROAST][LANG:english]
    return raw.replace(/^\[ROAST\]/, "").replace(/\[LANG:[^\]]+\]/, "").trim() || "Unknown Role";
}

function isRoastSession(raw: string | null): boolean {
    return raw?.startsWith("[ROAST]") ?? false;
}

function scoreColor(score: number): string {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-blue-400";
    if (score >= 4) return "text-amber-400";
    return "text-red-400";
}

function scoreBg(score: number): string {
    if (score >= 8) return "bg-emerald-400/10 border-emerald-400/20";
    if (score >= 6) return "bg-blue-400/10 border-blue-400/20";
    if (score >= 4) return "bg-amber-400/10 border-amber-400/20";
    return "bg-red-400/10 border-red-400/20";
}

function qualColor(qual: string | null): string {
    switch (qual) {
        case "Excellent": return "text-emerald-400";
        case "Very Good": return "text-blue-400";
        case "Good":      return "text-sky-400";
        case "Decent":    return "text-amber-400";
        default:          return "text-red-400";
    }
}

function typeIcon(type: string) {
    if (type === "code") return <Code2 className="w-3.5 h-3.5 text-violet-400" />;
    if (type === "mcq")  return <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />;
    return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
}

function typeLabel(type: string): string {
    if (type === "code") return "Code";
    if (type === "mcq")  return "MCQ";
    return "Theory";
}

// ── Breakdown Row ─────────────────────────────────────────────────────────────

function BreakdownRow({ item, index }: { item: InterviewBreakdownItem; index: number }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-border/10 last:border-0">
            {/* Summary row */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/10 transition-colors"
            >
                <span className="text-xs font-mono text-muted-foreground/30 w-5 flex-shrink-0">
                    {index + 1}
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                    {typeIcon(item.type)}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                        {typeLabel(item.type)}
                    </span>
                </span>
                <p className="flex-1 text-sm text-foreground/70 truncate">{item.question}</p>
                <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${scoreBg(item.score)}`}>
                    <span className={scoreColor(item.score)}>{item.score}</span>
                    <span className="text-muted-foreground/30">/10</span>
                </div>
                {open
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                }
            </button>

            {/* Expanded detail */}
            {open && (
                <div className="px-4 pb-4 pt-1 space-y-3 bg-secondary/5 border-t border-border/10 animate-in slide-in-from-top-1 fade-in duration-150">
                    {/* Your answer */}
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-1.5">Your Answer</p>
                        <p className="text-sm text-foreground/60 leading-relaxed bg-secondary/20 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
                            {item.user_answer || <span className="italic text-muted-foreground/30">No answer provided</span>}
                        </p>
                    </div>

                    {/* Feedback */}
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-1.5">Feedback</p>
                        <p className="text-sm text-foreground/70 leading-relaxed">{item.feedback}</p>
                    </div>

                    {/* Ideal answer */}
                    <div>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 mb-1.5">Ideal Answer</p>
                        <p className="text-sm text-emerald-300/80 leading-relaxed bg-emerald-400/5 border border-emerald-400/10 rounded-lg px-3 py-2.5 whitespace-pre-wrap">
                            {item.ideal_answer}
                        </p>
                    </div>

                    {/* Code-specific fields */}
                    {item.type === "code" && (item.tc || item.sc || item.quality) && (
                        <div className="flex flex-wrap gap-3">
                            {item.tc && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                    <span className="font-mono text-muted-foreground/30">TC:</span>
                                    <span className="font-semibold text-foreground/60">{item.tc}</span>
                                </div>
                            )}
                            {item.sc && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                    <span className="font-mono text-muted-foreground/30">SC:</span>
                                    <span className="font-semibold text-foreground/60">{item.sc}</span>
                                </div>
                            )}
                            {item.quality && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                    <span className="font-mono text-muted-foreground/30">Quality:</span>
                                    <span className="font-semibold text-foreground/60">{item.quality}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Report Card ───────────────────────────────────────────────────────────────

function ReportCard({ report }: { report: InterviewHistoryItem }) {
    const [expanded, setExpanded] = useState(false);
    const role = formatRole(report.role);
    const roast = isRoastSession(report.role);
    const answered = report.answers_count;
    const total = report.questions_count;

    return (
        <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden hover:border-border/35 transition-colors">
            {/* Card header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/10 transition-colors"
            >
                {/* Score circle */}
                <div className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 ${scoreBg(report.overall_score)}`}>
                    <span className={`text-xl font-bold font-mono leading-none ${scoreColor(report.overall_score)}`}>
                        {report.overall_score}
                    </span>
                    <span className="text-[9px] text-muted-foreground/30 font-mono">/10</span>
                </div>

                {/* Role + meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground/80 truncate">{role}</p>
                        {roast && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                                🔥 Roast
                            </span>
                        )}
                        {report.qualitative_score && (
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${qualColor(report.qualitative_score)}`}>
                                {report.qualitative_score}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground/40">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(report.created_at)}
                        </span>
                        <span>·</span>
                        <span>{answered}/{total} answered</span>
                        {report.experience_level && (
                            <>
                                <span>·</span>
                                <span className="capitalize">{report.experience_level}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Score bar (desktop) */}
                <div className="hidden sm:flex flex-col items-end gap-1.5 min-w-[80px]">
                    <div className="h-1.5 w-20 rounded-full bg-secondary/40">
                        <div
                            className={`h-full rounded-full transition-all ${
                                report.overall_score >= 8 ? "bg-emerald-400" :
                                report.overall_score >= 6 ? "bg-blue-400" :
                                report.overall_score >= 4 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${(report.overall_score / 10) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground/30 font-mono">
                        {Math.round((report.overall_score / 10) * 100)}%
                    </span>
                </div>

                {expanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                }
            </button>

            {/* Expanded breakdown */}
            {expanded && (
                <div className="border-t border-border/15 animate-in slide-in-from-top-2 fade-in duration-200">
                    {report.breakdown && report.breakdown.length > 0 ? (
                        <>
                            <div className="px-5 py-3 border-b border-border/10 flex items-center gap-2">
                                <BarChart3 className="w-3.5 h-3.5 text-muted-foreground/40" />
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">
                                    Question Breakdown
                                </p>
                            </div>
                            {report.breakdown.map((item, i) => (
                                <BreakdownRow key={i} item={item} index={i} />
                            ))}
                        </>
                    ) : (
                        <div className="px-5 py-6 text-center text-sm text-muted-foreground/40">
                            No breakdown data available for this session.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InterviewHistory() {
    const auth = useAuthContext();
    const navigate = useNavigate();

    const [reports, setReports] = useState<InterviewHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        setLoading(true);
        apiGetInterviewHistory()
            .then((data) => { setReports(data); setError(""); })
            .catch((e) => setError(friendlyError(e, "Failed to load interview history.")))
            .finally(() => setLoading(false));
    }, [auth.isAuthenticated]);

    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    // Stats from loaded reports
    const avgScore = reports.length > 0
        ? Math.round((reports.reduce((s, r) => s + r.overall_score, 0) / reports.length) * 10) / 10
        : null;
    const bestScore = reports.length > 0
        ? Math.max(...reports.map((r) => r.overall_score))
        : null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="pt-24 pb-16">
                <div className="container max-w-4xl">

                    {/* Header */}
                    <div className="mb-8">
                        <Link
                            to="/dashboard"
                            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Dashboard
                        </Link>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                                    <Mic2 className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight">Interview History</h1>
                                    <p className="text-sm text-muted-foreground/60">
                                        {reports.length > 0
                                            ? `${reports.length} session${reports.length !== 1 ? "s" : ""} completed`
                                            : "Your past mock interview sessions"
                                        }
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/interview"
                                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                <Mic2 className="w-4 h-4" />
                                New Interview
                            </Link>
                        </div>
                    </div>

                    {/* Stats row — only when there's data */}
                    {reports.length > 0 && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="rounded-xl border border-border/20 bg-card/60 p-4 text-center">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Sessions</p>
                                <p className="text-2xl font-bold text-foreground/80">{reports.length}</p>
                            </div>
                            <div className="rounded-xl border border-border/20 bg-card/60 p-4 text-center">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Avg Score</p>
                                <p className={`text-2xl font-bold font-mono ${avgScore !== null ? scoreColor(avgScore) : "text-muted-foreground/30"}`}>
                                    {avgScore ?? "—"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-border/20 bg-card/60 p-4 text-center">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Best Score</p>
                                <p className={`text-2xl font-bold font-mono ${bestScore !== null ? scoreColor(bestScore) : "text-muted-foreground/30"}`}>
                                    {bestScore ?? "—"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 rounded-xl bg-border/10 animate-pulse" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/10">
                            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="rounded-xl border border-border/20 bg-card/60 py-16 text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto">
                                <Mic2 className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-foreground/60">No interviews yet</p>
                                <p className="text-sm text-muted-foreground/40 mt-1">
                                    Complete your first AI mock interview to see your history here.
                                </p>
                            </div>
                            <Link
                                to="/interview"
                                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                <Sparkles className="w-4 h-4" />
                                Start Your First Interview
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <ReportCard key={report.id} report={report} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
