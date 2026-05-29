import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    apiGetAdminStats, apiGetAdminUsers, apiGrantCredits, apiSetUnlimited, apiGetUserActivity,
    type AdminStats, type AdminUser, type UserActivity,
} from "@/lib/api";
import {
    Users, FileText, BarChart3, Mail, Mic2,
    ShieldCheck, Gauge, Lock, Loader2,
    TrendingUp, Activity, RefreshCw, Clock,
    Zap, Infinity as InfinityIcon, CreditCard, ChevronDown, ChevronUp,
    Gift, ToggleLeft, ToggleRight, AlertTriangle, LogIn, Search,
    Eye, X,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Invalid date";
    const diff = Date.now() - d.getTime();
    if (diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
}

function activityLabel(type: string): string {
    const map: Record<string, string> = {
        job_match_score: "ATS Match", general_roast: "Roast Analysis",
        deep_roast: "Deep Roast", cover_letter: "Cover Letter",
        interview_report: "Interview", deep_analysis: "Deep Analysis",
        hiring_intel: "Hiring Intel",
    };
    return map[type] ?? type;
}

function activityColor(type: string): string {
    const map: Record<string, string> = {
        job_match_score: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        general_roast: "text-red-400 bg-red-400/10 border-red-400/20",
        deep_roast: "text-orange-400 bg-orange-400/10 border-orange-400/20",
        cover_letter: "text-purple-400 bg-purple-400/10 border-purple-400/20",
        interview_report: "text-teal-400 bg-teal-400/10 border-teal-400/20",
        deep_analysis: "text-blue-300 bg-blue-300/10 border-blue-300/20",
        hiring_intel: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    };
    return map[type] ?? "text-muted-foreground bg-secondary/20 border-border/20";
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "text-foreground", loading }: {
    label: string; value: number | string; sub?: string;
    icon: React.ElementType; color?: string; loading: boolean;
}) {
    return (
        <div className="rounded-xl border border-border/25 bg-card/60 backdrop-blur-sm p-5 hover:border-border/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">{label}</p>
                <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center group-hover:bg-secondary/60 transition-colors">
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
            </div>
            {loading ? (
                <div className="h-9 w-16 bg-border/20 rounded animate-pulse" />
            ) : (
                <p className={`text-3xl font-bold tracking-tight ${value === -1 ? "text-muted-foreground/30" : color}`}>
                    {value === -1 ? "—" : value}
                </p>
            )}
            {sub && <p className="mt-1 text-xs text-muted-foreground/50">{sub}</p>}
        </div>
    );
}

// ── User Activity Modal ───────────────────────────────────────────────────────

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
            <div
                className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border/30 bg-background shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
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

                {/* Credit summary bar */}
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
                            {/* Analyses */}
                            {activeTab === "analyses" && (
                                <div className="space-y-1.5">
                                    {activity.analyses.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/40 text-center py-8">No analyses yet.</p>
                                    ) : activity.analyses.map(a => (
                                        <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/10 border border-border/10">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${activityColor(a.analysis_type)}`}>
                                                {activityLabel(a.analysis_type)}
                                            </span>
                                            <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />{formatDate(a.created_at)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Interviews */}
                            {activeTab === "interviews" && (
                                <div className="space-y-1.5">
                                    {activity.interviews.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/40 text-center py-8">No interviews yet.</p>
                                    ) : activity.interviews.map(iv => (
                                        <div key={iv.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/10 border border-border/10">
                                            <div>
                                                <p className="text-sm font-medium text-foreground/80">{iv.role ?? "Unknown role"}</p>
                                                <p className="text-xs text-muted-foreground/50">{iv.experience_level} · {iv.questions_count} questions</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-teal-400">{iv.overall_score}/10</p>
                                                <p className="text-xs text-muted-foreground/50">{timeAgo(iv.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Resumes */}
                            {activeTab === "resumes" && (
                                <div className="space-y-1.5">
                                    {activity.resumes.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/40 text-center py-8">No resumes uploaded yet.</p>
                                    ) : activity.resumes.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/10 border border-border/10">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                <p className="text-sm text-foreground/70 truncate">
                                                    {r.file_url.split("/").pop()?.replace(/^\d+_/, "") ?? "resume.pdf"}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-3">
                                                {r.resume_quality_feedback != null && (
                                                    <p className="text-xs font-semibold text-blue-400">Score: {r.resume_quality_feedback}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground/50">{timeAgo(r.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cover Letters */}
                            {activeTab === "cover_letters" && (
                                <div className="space-y-1.5">
                                    {activity.cover_letters.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/40 text-center py-8">No cover letters yet.</p>
                                    ) : activity.cover_letters.map(cl => (
                                        <div key={cl.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/10 border border-border/10">
                                            <div>
                                                <p className="text-sm font-medium text-foreground/80">{cl.job_title ?? "Unknown role"}</p>
                                                <p className="text-xs text-muted-foreground/50">{cl.company_name ?? "Unknown company"}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground/50">{timeAgo(cl.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Credits */}
                            {activeTab === "credits" && (
                                <div className="space-y-1.5">
                                    {activity.credit_transactions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground/40 text-center py-8">No credit transactions yet.</p>
                                    ) : activity.credit_transactions.map(ct => (
                                        <div key={ct.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/10 border border-border/10">
                                            <div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${activityColor(ct.feature)}`}>
                                                    {activityLabel(ct.feature)}
                                                </span>
                                                <p className="text-xs text-muted-foreground/50 mt-0.5">{ct.credits_before} → {ct.credits_after}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-amber-400">-{ct.credits_used}</p>
                                                <p className="text-xs text-muted-foreground/50">{timeAgo(ct.created_at)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({ user, onGrant, onToggleUnlimited, onViewActivity }: {
    user: AdminUser;
    onGrant: (userId: string, amount: number) => Promise<void>;
    onToggleUnlimited: (userId: string, current: boolean) => Promise<void>;
    onViewActivity: (user: AdminUser) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [grantAmount, setGrantAmount] = useState("50");
    const [granting, setGranting] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [localUser, setLocalUser] = useState(user);

    const pct = localUser.total_credits_granted > 0
        ? Math.round((localUser.remaining_credits / localUser.total_credits_granted) * 100)
        : 0;

    const barColor = pct <= 10 ? "bg-red-500" : pct <= 25 ? "bg-amber-500" : "bg-emerald-500";
    const textColor = pct <= 10 ? "text-red-400" : pct <= 25 ? "text-amber-400" : "text-emerald-400";

    async function handleGrant() {
        const amt = parseInt(grantAmount, 10);
        if (!amt || amt <= 0) return;
        setGranting(true);
        try {
            await onGrant(localUser.id, amt);
            setLocalUser(prev => ({
                ...prev,
                remaining_credits: prev.remaining_credits + amt,
                total_credits_granted: prev.total_credits_granted + amt,
            }));
        } finally {
            setGranting(false);
        }
    }

    async function handleToggle() {
        setToggling(true);
        try {
            await onToggleUnlimited(localUser.id, localUser.is_unlimited);
            setLocalUser(prev => ({ ...prev, is_unlimited: !prev.is_unlimited }));
        } finally {
            setToggling(false);
        }
    }

    // Format last login with full date on hover via title attribute
    const lastLoginText = localUser.last_sign_in_at ? timeAgo(localUser.last_sign_in_at) : "Never";
    const lastLoginFull = localUser.last_sign_in_at ? formatDate(localUser.last_sign_in_at) : "Never logged in";

    return (
        <div className="border-b border-border/10 last:border-0">
            <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-secondary/10 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                    {(localUser.email?.[0] ?? "U").toUpperCase()}
                </div>

                {/* Email + badges */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground/80 truncate">{localUser.email}</p>
                        {localUser.is_admin && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Admin</span>
                        )}
                        {localUser.is_unlimited && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded border border-violet-400/20 flex items-center gap-1">
                                <InfinityIcon className="w-2.5 h-2.5" />Unlimited
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Joined {timeAgo(localUser.created_at)}
                        </span>
                        <span
                            title={lastLoginFull}
                            className="text-xs flex items-center gap-1 font-medium cursor-help"
                            style={{ color: localUser.last_sign_in_at ? "rgb(134 239 172 / 0.8)" : "rgb(148 163 184 / 0.4)" }}
                        >
                            <LogIn className="w-3 h-3" />
                            {localUser.last_sign_in_at ? `Last login: ${lastLoginText}` : "Never logged in"}
                        </span>
                    </div>
                </div>

                {/* Credit bar */}
                <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                    {localUser.is_unlimited ? (
                        <span className="text-xs font-semibold text-violet-400 flex items-center gap-1">
                            <InfinityIcon className="w-3 h-3" /> Unlimited
                        </span>
                    ) : (
                        <>
                            <span className={`text-xs font-semibold ${textColor}`}>
                                {localUser.remaining_credits} / {localUser.total_credits_granted}
                            </span>
                            <div className="h-1 w-24 rounded-full bg-secondary/40">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                        </>
                    )}
                </div>

                {/* View activity button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onViewActivity(localUser); }}
                    className="flex-shrink-0 w-7 h-7 rounded-lg bg-secondary/20 hover:bg-primary/20 border border-border/20 hover:border-primary/30 flex items-center justify-center transition-colors"
                    title="View full activity"
                >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                </button>

                {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />}
            </div>

            {/* Expanded panel */}
            {expanded && (
                <div className="px-5 pb-4 pt-1 bg-secondary/5 border-t border-border/10 space-y-4 animate-in slide-in-from-top-1 fade-in duration-150">
                    {/* Full timestamps */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-secondary/20 px-3 py-2">
                            <p className="text-muted-foreground/50 mb-0.5">Joined</p>
                            <p className="font-medium text-foreground/70">{formatDate(localUser.created_at)}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/20 px-3 py-2">
                            <p className="text-muted-foreground/50 mb-0.5">Last Login</p>
                            <p className="font-medium text-green-400/80">{formatDate(localUser.last_sign_in_at)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-secondary/20 p-3">
                            <p className="text-xs text-muted-foreground/50 mb-1">Granted</p>
                            <p className="text-lg font-bold text-foreground/80">{localUser.total_credits_granted}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/20 p-3">
                            <p className="text-xs text-muted-foreground/50 mb-1">Used</p>
                            <p className="text-lg font-bold text-amber-400">{localUser.credits_used}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/20 p-3">
                            <p className="text-xs text-muted-foreground/50 mb-1">Remaining</p>
                            <p className={`text-lg font-bold ${textColor}`}>{localUser.remaining_credits}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Grant credits */}
                        <div className="flex items-center gap-2 flex-1">
                            <Gift className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <input
                                type="number"
                                value={grantAmount}
                                onChange={(e) => setGrantAmount(e.target.value)}
                                min="1" max="10000"
                                onClick={e => e.stopPropagation()}
                                className="w-20 bg-secondary/20 border border-border/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/40"
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); handleGrant(); }}
                                disabled={granting}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                                {granting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                Grant Credits
                            </button>
                        </div>

                        {/* Toggle unlimited */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                            disabled={toggling}
                            className={`flex items-center gap-2 h-8 px-3 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-50 ${
                                localUser.is_unlimited
                                    ? "bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20"
                                    : "bg-secondary/20 border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            }`}
                        >
                            {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : localUser.is_unlimited ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            {localUser.is_unlimited ? "Revoke Unlimited" : "Set Unlimited"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");
    const [search, setSearch] = useState("");
    const [activityUser, setActivityUser] = useState<AdminUser | null>(null);

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) navigate("/", { replace: true });
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    async function fetchStats() {
        setError("");
        try {
            const data = await apiGetAdminStats();
            setStats(data);
        } catch (e: unknown) {
            setError((e as Error).message ?? "Failed to load stats.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function fetchUsers() {
        setUsersLoading(true);
        try {
            const data = await apiGetAdminUsers();
            setUsers(data);
        } catch (e: unknown) {
            setError((e as Error).message ?? "Failed to load users.");
        } finally {
            setUsersLoading(false);
        }
    }

    useEffect(() => {
        if (!auth.isLoading && auth.isAuthenticated && auth.isAdmin) {
            fetchStats();
            fetchUsers();
        } else if (!auth.isLoading && auth.isAuthenticated && !auth.isAdmin) {
            setLoading(false);
        }
    }, [auth.isLoading, auth.isAuthenticated, auth.isAdmin]);

    function handleRefresh() {
        setRefreshing(true);
        fetchStats();
        fetchUsers();
    }

    async function handleGrant(userId: string, amount: number) {
        await apiGrantCredits(userId, amount, "admin_grant");
    }

    async function handleToggleUnlimited(userId: string, current: boolean) {
        await apiSetUnlimited(userId, !current);
    }

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
    );

    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    if (!auth.isAdmin) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container max-w-lg text-center space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                            <Lock className="w-8 h-8 text-destructive" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
                            <p className="mt-2 text-sm text-muted-foreground/70">
                                You do not have permission to view this page. Admin access requires the
                                <code className="mx-1 px-1.5 py-0.5 rounded bg-secondary text-xs">is_admin</code>
                                role in your account profile.
                            </p>
                        </div>
                        <Link to="/dashboard" className="inline-flex h-10 items-center gap-2 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                            Back to Dashboard
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            {/* Activity modal */}
            {activityUser && (
                <UserActivityModal user={activityUser} onClose={() => setActivityUser(null)} />
            )}

            <main className="pt-24 pb-16">
                <div className="container max-w-6xl space-y-6">

                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/30 bg-secondary/20 px-3 py-1 text-xs text-muted-foreground">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                Admin Console · {auth.user?.email}
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Platform Admin</h1>
                            <p className="mt-1 text-sm text-muted-foreground/70">Live usage data and credit management. Admin only.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleRefresh} disabled={refreshing}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/40 bg-card px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors disabled:opacity-50">
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                            <Link to="/dashboard" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/40 bg-card px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">
                                ← Dashboard
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-border/20">
                        {(["overview", "users"] as const).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 transition-colors ${
                                    activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                                }`}>
                                {tab === "users" ? `Users (${users.length})` : "Overview"}
                            </button>
                        ))}
                    </div>

                    {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <StatCard label="Total Users" value={stats?.total_users ?? 0} sub={stats ? `+${stats.new_users_7d} this week` : undefined} icon={Users} color="text-emerald-400" loading={loading} />
                                <StatCard label="Resumes Uploaded" value={stats?.total_resumes ?? 0} icon={FileText} color="text-blue-400" loading={loading} />
                                <StatCard label="Total AI Analyses" value={stats?.total_analyses ?? 0} icon={BarChart3} color="text-purple-400" loading={loading} />
                                <StatCard label="Cover Letters" value={stats?.total_cover_letters ?? 0} icon={Mail} color="text-amber-400" loading={loading} />
                                <StatCard label="Interviews Completed" value={stats?.total_interviews ?? 0} icon={Mic2} color="text-teal-400" loading={loading} />
                                <StatCard label="New Users (7d)" value={stats?.new_users_7d ?? 0} icon={TrendingUp} color="text-pink-400" loading={loading} />
                            </div>

                            {/* Credit system stats */}
                            <section className="rounded-xl border border-border/25 bg-card/60 p-5">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Credits</p>
                                        <h2 className="text-base font-semibold">Credit System Overview</h2>
                                    </div>
                                </div>
                                {loading ? (
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-border/15 animate-pulse" />)}
                                    </div>
                                ) : stats?.credit_stats ? (
                                    <div className="space-y-4">
                                        <div className="grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-lg bg-secondary/20 p-4 text-center">
                                                <p className="text-xs text-muted-foreground/50 mb-1">Total Granted</p>
                                                <p className="text-2xl font-bold text-emerald-400">{stats.credit_stats.total_credits_granted.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-lg bg-secondary/20 p-4 text-center">
                                                <p className="text-xs text-muted-foreground/50 mb-1">Total Used</p>
                                                <p className="text-2xl font-bold text-amber-400">{stats.credit_stats.total_credits_used.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-lg bg-secondary/20 p-4 text-center">
                                                <p className="text-xs text-muted-foreground/50 mb-1">Remaining (all users)</p>
                                                <p className="text-2xl font-bold text-blue-400">
                                                    {(stats.credit_stats.total_credits_granted - stats.credit_stats.total_credits_used).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {Object.keys(stats.credit_stats.per_feature_usage).length > 0 && (
                                            <div>
                                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">Credits Used Per Feature</p>
                                                <div className="space-y-2">
                                                    {Object.entries(stats.credit_stats.per_feature_usage)
                                                        .sort(([,a],[,b]) => b - a)
                                                        .map(([feature, used]) => {
                                                            const cost = stats.feature_costs?.[feature] ?? 0;
                                                            const sessions = cost > 0 ? Math.round(used / cost) : 0;
                                                            return (
                                                                <div key={feature} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${activityColor(feature)}`}>
                                                                        {activityLabel(feature)}
                                                                    </span>
                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                                                                        <span className="font-semibold text-foreground/70">{used} credits</span>
                                                                        <span>·</span>
                                                                        <span>{sessions} uses</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground/40">No credit data yet.</p>
                                )}
                            </section>

                            {/* Analysis breakdown + Activity feed */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <section className="rounded-xl border border-border/25 bg-card/60 p-5">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                                            <BarChart3 className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Breakdown</p>
                                            <h2 className="text-base font-semibold">Analysis by Type</h2>
                                        </div>
                                    </div>
                                    {loading ? (
                                        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-border/15 animate-pulse" />)}</div>
                                    ) : stats && Object.keys(stats.analysis_type_breakdown).length > 0 ? (
                                        <div className="space-y-2">
                                            {Object.entries(stats.analysis_type_breakdown).sort(([,a],[,b]) => b - a).map(([type, count]) => {
                                                const pct = stats.total_analyses > 0 ? Math.round((count / stats.total_analyses) * 100) : 0;
                                                return (
                                                    <div key={type} className="space-y-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${activityColor(type)}`}>{activityLabel(type)}</span>
                                                            <span className="font-semibold">{count} <span className="text-muted-foreground/50 font-normal">({pct}%)</span></span>
                                                        </div>
                                                        <div className="h-1.5 w-full rounded-full bg-secondary/30">
                                                            <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground/40">No analyses recorded yet.</p>}
                                </section>

                                <section className="rounded-xl border border-border/25 bg-card/60 p-5">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                                            <Activity className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Feed</p>
                                            <h2 className="text-base font-semibold">Recent Activity</h2>
                                        </div>
                                    </div>
                                    {loading ? (
                                        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-9 rounded-lg bg-border/15 animate-pulse" />)}</div>
                                    ) : stats && stats.recent_activity.length > 0 ? (
                                        <div className="space-y-2">
                                            {stats.recent_activity.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${activityColor(item.analysis_type)}`}>{activityLabel(item.analysis_type)}</span>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
                                                        <Clock className="w-3 h-3" />{timeAgo(item.created_at)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-muted-foreground/40">No recent activity.</p>}
                                </section>
                            </div>

                            {/* Rate limits */}
                            <section className="rounded-xl border border-border/25 bg-card/60 p-5">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                                        <Gauge className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Config</p>
                                        <h2 className="text-base font-semibold">Current Rate Limits</h2>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {[["Auth","5 / minute"],["Upload","5 / day"],["Analysis","5 / hour"],["Cover Letter","5 / hour"],["Interview","5 / hour"],["ATS Score","5 / hour"]].map(([name, limit]) => (
                                        <div key={name} className="rounded-lg border border-border/20 bg-secondary/10 px-4 py-3 flex items-center justify-between">
                                            <span className="text-sm font-medium">{name}</span>
                                            <span className="text-xs font-mono text-muted-foreground/70 bg-secondary/30 px-2 py-0.5 rounded">{limit}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── USERS TAB ────────────────────────────────────────── */}
                    {activeTab === "users" && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-border/25 bg-card/60 overflow-hidden">
                                <div className="px-5 py-4 border-b border-border/15 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                    <div>
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Enrolled Users</p>
                                        <h2 className="text-base font-semibold">{filteredUsers.length} {search ? "matching" : "total"} users</h2>
                                    </div>
                                    {/* Search */}
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
                                </div>
                                <div className="px-5 py-2 border-b border-border/10 bg-secondary/5">
                                    <p className="text-xs text-muted-foreground/40 flex items-center gap-2">
                                        <Eye className="w-3 h-3" /> Click the eye icon to view full user activity · Click a row to manage credits
                                    </p>
                                </div>
                                {usersLoading ? (
                                    <div className="p-5 space-y-3">
                                        {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-lg bg-border/15 animate-pulse" />)}
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    <div>
                                        {filteredUsers.map((u) => (
                                            <UserRow
                                                key={u.id}
                                                user={u}
                                                onGrant={handleGrant}
                                                onToggleUnlimited={handleToggleUnlimited}
                                                onViewActivity={setActivityUser}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="p-8 text-center text-sm text-muted-foreground/40">
                                        {search ? `No users matching "${search}"` : "No users found."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
