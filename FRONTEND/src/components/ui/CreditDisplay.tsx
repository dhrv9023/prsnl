/**
 * CreditDisplay — full credit balance card for Dashboard / feature pages.
 *
 * Variants:
 *  - "card"    : full card with progress bar (for Dashboard)
 *  - "compact" : single-line inline display (for feature page headers)
 *  - "inline"  : just the number + label (for button tooltips)
 */

import { Zap, AlertTriangle, Infinity, TrendingDown } from "lucide-react";
import { useCreditContext, type FeatureKey } from "@/contexts/CreditContext";

// ── Shared helpers ────────────────────────────────────────────────────────────

function pctColor(pct: number) {
    if (pct <= 10) return { bar: "bg-red-500", text: "text-red-400", border: "border-red-500/20" };
    if (pct <= 25) return { bar: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/20" };
    return { bar: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/20" };
}

// ── Card variant ──────────────────────────────────────────────────────────────

export function CreditCard() {
    const { balance, isLoading } = useCreditContext();

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border/20 bg-card/60 p-5 animate-pulse">
                <div className="h-3 w-24 bg-border/20 rounded mb-4" />
                <div className="h-8 w-20 bg-border/20 rounded mb-3" />
                <div className="h-2 w-full bg-border/15 rounded-full" />
            </div>
        );
    }

    if (!balance) return null;

    if (balance.is_unlimited) {
        return (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Credits</p>
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Infinity className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-primary tracking-tight">Unlimited</p>
                <p className="text-xs text-muted-foreground/50 mt-1.5">Admin account — all features unlocked</p>
            </div>
        );
    }

    const pct = balance.total_granted > 0
        ? Math.round((balance.remaining / balance.total_granted) * 100)
        : 0;
    const colors = pctColor(pct);

    return (
        <div className={`rounded-xl border bg-card/60 p-5 ${colors.border}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Credits</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pct <= 25 ? "bg-amber-500/10" : "bg-emerald-500/8"}`}>
                    <Zap className={`w-4 h-4 ${colors.text}`} />
                </div>
            </div>

            <div className="flex items-baseline gap-1.5 mb-1">
                <p className={`text-3xl font-bold tracking-tight ${colors.text}`}>
                    {balance.remaining}
                </p>
                <p className="text-sm text-muted-foreground/40 font-normal">
                    / {balance.total_granted}
                </p>
            </div>

            <p className="text-xs text-muted-foreground/50 mb-3">
                {balance.used} used · {balance.remaining} remaining
            </p>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full bg-secondary/40">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Low credit warning */}
            {balance.low_credits && (
                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/90 leading-snug">
                        Running low on credits. You have {balance.remaining} credits left.
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Compact variant (for feature page headers) ────────────────────────────────

export function CreditCompact() {
    const { balance } = useCreditContext();
    if (!balance) return null;

    if (balance.is_unlimited) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Infinity className="w-3.5 h-3.5" />
                Unlimited
            </span>
        );
    }

    const pct = balance.total_granted > 0
        ? Math.round((balance.remaining / balance.total_granted) * 100)
        : 0;
    const colors = pctColor(pct);

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colors.text}`}>
            <Zap className="w-3.5 h-3.5" />
            {balance.remaining} credits
        </span>
    );
}

// ── Feature cost tag ──────────────────────────────────────────────────────────

interface FeatureCostTagProps {
    feature: FeatureKey;
    className?: string;
}

export function FeatureCostTag({ feature, className = "" }: FeatureCostTagProps) {
    const { featureCosts, balance } = useCreditContext();
    const info = featureCosts[feature];
    if (!info) return null;

    const canAfford = balance?.is_unlimited || (balance?.remaining ?? 0) >= info.cost;

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                canAfford
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-600/25 dark:border-emerald-400/20"
                    : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-600/25 dark:border-red-400/20"
            } ${className}`}
        >
            <Zap className="w-3 h-3" />
            {info.cost} credits
        </span>
    );
}

// ── Insufficient credits warning ──────────────────────────────────────────────

interface InsufficientCreditsProps {
    feature: FeatureKey;
}

export function InsufficientCreditsWarning({ feature }: InsufficientCreditsProps) {
    const { balance, featureCosts, shortfall } = useCreditContext();
    const info = featureCosts[feature];
    const sf = shortfall(feature);

    if (!info || sf === 0 || balance?.is_unlimited) return null;

    return (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/8 border border-red-500/20">
            <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-red-400">Insufficient credits</p>
                <p className="text-xs text-red-400/70 mt-0.5 leading-snug">
                    {info.label} costs <strong>{info.cost} credits</strong>.
                    You need <strong>{sf} more credits</strong> to use this feature.
                    You currently have {balance?.remaining ?? 0} credits.
                </p>
            </div>
        </div>
    );
}

// ── Feature pricing table ─────────────────────────────────────────────────────

const FEATURE_ICONS: Record<string, string> = {
    ats_score:     "⚡",
    deep_analysis: "🔍",
    hiring_intel:  "🧠",
    interview:     "🎤",
    cover_letter:  "✉️",
};

export function FeaturePricingTable() {
    const { featureCosts, balance } = useCreditContext();

    const entries = Object.entries(featureCosts);
    if (entries.length === 0) return null;

    return (
        <div className="rounded-xl border border-border/20 bg-card/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-border/15">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Feature Costs</p>
            </div>
            <div className="divide-y divide-border/10">
                {entries.map(([key, info]) => {
                    const canAfford = balance?.is_unlimited || (balance?.remaining ?? 0) >= info.cost;
                    return (
                        <div key={key} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-2.5">
                                <span className="text-base">{FEATURE_ICONS[key] ?? "✦"}</span>
                                <span className="text-sm font-medium text-foreground/80">{info.label}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                canAfford
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-600/25 dark:border-emerald-400/20"
                                    : "text-red-600 dark:text-red-400 bg-red-500/10 border-red-600/25 dark:border-red-400/20"
                            }`}>
                                <Zap className="w-3 h-3" />
                                {info.cost}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
