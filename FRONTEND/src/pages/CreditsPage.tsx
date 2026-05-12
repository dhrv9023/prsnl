/**
 * CreditsPage — shows credit balance, transaction history, and buy credits options.
 * Accessible by clicking the credit badge in the navbar.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreditContext } from "@/contexts/CreditContext";
import { apiGetCreditHistory, type CreditTransaction } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
    Zap, ArrowLeft, Loader2, Clock, TrendingDown, TrendingUp,
    Gift, ShoppingCart, Infinity, AlertTriangle, RefreshCw,
    Sparkles, CheckCircle2,
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
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const FEATURE_ICONS: Record<string, string> = {
    ats_score:     "⚡",
    deep_analysis: "🔍",
    hiring_intel:  "🧠",
    interview:     "🎤",
    cover_letter:  "✉️",
    humanize:      "✨",
    initial_grant: "🎁",
    admin_grant:   "🛡️",
};

// ── Buy Credits Plans ─────────────────────────────────────────────────────────

const CREDIT_PLANS = [
    {
        credits: 100,
        price: "₹49",
        priceUSD: "$0.59",
        label: "Starter",
        popular: false,
        features: ["100 credits", "~20 ATS scans", "~6 Deep analyses", "~4 Hiring Intel reports"],
        color: "border-border/30",
    },
    {
        credits: 300,
        price: "₹99",
        priceUSD: "$1.19",
        label: "Popular",
        popular: true,
        features: ["300 credits", "~60 ATS scans", "~20 Deep analyses", "~12 Hiring Intel reports", "~12 Mock Interviews"],
        color: "border-primary/40",
    },
    {
        credits: 1000,
        price: "₹249",
        priceUSD: "$2.99",
        label: "Power User",
        popular: false,
        features: ["1000 credits", "~200 ATS scans", "~66 Deep analyses", "~40 Hiring Intel reports", "~40 Mock Interviews"],
        color: "border-border/30",
    },
];

// ── Transaction Row ───────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: CreditTransaction }) {
    const isGrant = tx.credits_used === 0;
    const icon = FEATURE_ICONS[tx.feature] ?? "✦";
    const delta = isGrant
        ? tx.credits_after - tx.credits_before
        : -tx.credits_used;

    return (
        <div className="flex items-center gap-4 py-3.5 border-b border-border/10 last:border-0">
            <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center text-base flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/80 truncate">{tx.label}</p>
                <p className="text-xs text-muted-foreground/40 mt-0.5">{timeAgo(tx.created_at)}</p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold font-mono ${isGrant ? "text-emerald-400" : "text-red-400"}`}>
                    {isGrant ? `+${delta}` : `${delta}`}
                </p>
                <p className="text-[10px] text-muted-foreground/30 font-mono">{tx.credits_after} left</p>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const { balance, isLoading: balanceLoading, refresh } = useCreditContext();

    const [history, setHistory] = useState<CreditTransaction[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState("");
    const [activeTab, setActiveTab] = useState<"history" | "buy">("history");

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        setHistoryLoading(true);
        apiGetCreditHistory()
            .then((data) => { setHistory(data); setHistoryError(""); })
            .catch((e) => setHistoryError(friendlyError(e, "Failed to load transaction history.")))
            .finally(() => setHistoryLoading(false));
    }, [auth.isAuthenticated]);

    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    const pct = balance && balance.total_granted > 0
        ? Math.round((balance.remaining / balance.total_granted) * 100)
        : 0;

    const barColor = pct <= 10 ? "bg-red-500" : pct <= 25 ? "bg-amber-500" : "bg-emerald-500";
    const textColor = pct <= 10 ? "text-red-400" : pct <= 25 ? "text-amber-400" : "text-emerald-400";

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
                        <div className="flex items-center gap-3 mt-2">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
                                <p className="text-sm text-muted-foreground/60">Your balance, usage history, and top-up options</p>
                            </div>
                        </div>
                    </div>

                    {/* Balance Card */}
                    <div className="rounded-2xl border border-border/25 bg-card/60 backdrop-blur-sm p-6 mb-6">
                        {balanceLoading ? (
                            <div className="animate-pulse space-y-3">
                                <div className="h-3 w-24 bg-border/20 rounded" />
                                <div className="h-10 w-32 bg-border/20 rounded" />
                                <div className="h-2 w-full bg-border/15 rounded-full" />
                            </div>
                        ) : balance?.is_unlimited ? (
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Infinity className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Balance</p>
                                    <p className="text-3xl font-bold text-primary">Unlimited</p>
                                    <p className="text-xs text-muted-foreground/50 mt-1">Admin account — all features unlocked</p>
                                </div>
                            </div>
                        ) : balance ? (
                            <div className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">Remaining Credits</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className={`text-5xl font-bold font-mono tracking-tight ${textColor}`}>
                                                {balance.remaining}
                                            </p>
                                            <p className="text-lg text-muted-foreground/40 font-mono">/ {balance.total_granted}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={refresh}
                                        className="p-2 rounded-lg hover:bg-secondary/40 transition-colors text-muted-foreground/40 hover:text-muted-foreground"
                                        title="Refresh balance"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Progress bar */}
                                <div className="space-y-1.5">
                                    <div className="h-2.5 w-full rounded-full bg-secondary/40">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground/30">
                                        <span>{balance.used} used</span>
                                        <span>{pct}% remaining</span>
                                    </div>
                                </div>

                                {balance.low_credits && (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-amber-400">Running low on credits</p>
                                            <p className="text-xs text-amber-400/70 mt-0.5">
                                                You have {balance.remaining} credits left. Top up to keep using all features.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Feature cost reference */}
                    <div className="rounded-xl border border-border/20 bg-card/40 p-4 mb-6">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-3">Feature Costs</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { icon: "⚡", label: "ATS Score", cost: 5 },
                                { icon: "🔍", label: "Deep Analysis", cost: 15 },
                                { icon: "🧠", label: "Hiring Intel", cost: 25 },
                                { icon: "🎤", label: "Mock Interview", cost: 25 },
                                { icon: "✉️", label: "Cover Letter", cost: 10 },
                                { icon: "✨", label: "Humanize", cost: 15 },
                            ].map((f) => (
                                <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/20 border border-border/15">
                                    <span className="text-sm">{f.icon}</span>
                                    <span className="text-xs text-foreground/70 flex-1 truncate">{f.label}</span>
                                    <span className="text-xs font-bold font-mono text-primary/70">{f.cost}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 bg-secondary/20 rounded-xl p-1 border border-border/20">
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === "history"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                            }`}
                        >
                            <Clock className="w-4 h-4" /> Transaction History
                        </button>
                        <button
                            onClick={() => setActiveTab("buy")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === "buy"
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground/60 hover:text-muted-foreground"
                            }`}
                        >
                            <ShoppingCart className="w-4 h-4" /> Buy Credits
                        </button>
                    </div>

                    {/* History Tab */}
                    {activeTab === "history" && (
                        <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
                            <div className="px-5 py-4 border-b border-border/15 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground/40" />
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
                                        Recent Transactions
                                    </p>
                                </div>
                                {history.length > 0 && (
                                    <span className="text-xs text-muted-foreground/30 font-mono">{history.length} records</span>
                                )}
                            </div>

                            <div className="px-5">
                                {historyLoading ? (
                                    <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground/40">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Loading history…</span>
                                    </div>
                                ) : historyError ? (
                                    <div className="py-8 flex items-center justify-center gap-2 text-destructive/60">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm">{historyError}</span>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="py-12 text-center space-y-2">
                                        <div className="w-12 h-12 rounded-2xl bg-secondary/40 flex items-center justify-center mx-auto mb-3">
                                            <Zap className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm text-muted-foreground/50">No transactions yet</p>
                                        <p className="text-xs text-muted-foreground/30">Use a feature to see your credit history here</p>
                                        <Link
                                            to="/resume-analysis"
                                            className="inline-flex items-center gap-2 mt-3 h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Try Resume Analysis
                                        </Link>
                                    </div>
                                ) : (
                                    <div>
                                        {history.map((tx) => (
                                            <TransactionRow key={tx.id} tx={tx} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Buy Credits Tab */}
                    {activeTab === "buy" && (
                        <div className="space-y-4">
                            {/* Coming soon notice */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                                <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Payments coming soon</p>
                                    <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">
                                        We're setting up secure payment processing. For now, new users get 100 free credits on signup.
                                        Contact us if you need more credits for testing.
                                    </p>
                                </div>
                            </div>

                            {/* Plans */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                {CREDIT_PLANS.map((plan) => (
                                    <div
                                        key={plan.credits}
                                        className={`relative rounded-2xl border bg-card/60 p-5 flex flex-col gap-4 ${plan.popular ? "border-primary/40 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.15)]" : "border-border/25"}`}
                                    >
                                        {plan.popular && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-3 py-1 rounded-full">
                                                    Most Popular
                                                </span>
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">{plan.label}</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <p className="text-3xl font-bold tracking-tight">{plan.price}</p>
                                                <p className="text-xs text-muted-foreground/40">{plan.priceUSD}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Zap className="w-3.5 h-3.5 text-primary/70" />
                                                <p className="text-sm font-semibold text-primary/80">{plan.credits} credits</p>
                                            </div>
                                        </div>

                                        <ul className="space-y-1.5 flex-1">
                                            {plan.features.map((f) => (
                                                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground/60">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-400/60 flex-shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            disabled
                                            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-border/30 text-sm font-semibold text-muted-foreground/40 cursor-not-allowed bg-secondary/20"
                                        >
                                            <ShoppingCart className="w-4 h-4" />
                                            Coming Soon
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <p className="text-center text-xs text-muted-foreground/30 pt-2">
                                Credits never expire · Secure payments via Razorpay · GST included
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
