/**
 * CreditBadge — compact credit balance pill for the Navbar.
 * Shows: remaining / total  (or ∞ for unlimited users)
 * Turns amber when low, red when critically low.
 */

import { Zap, Infinity as InfinityIcon } from "lucide-react";
import { useCreditContext } from "@/contexts/CreditContext";
import { Link } from "react-router-dom";

export function CreditBadge() {
    const { balance, isLoading } = useCreditContext();

    if (isLoading || !balance) {
        return (
            <div className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-border/30 bg-secondary/20 animate-pulse">
                <div className="w-3 h-3 rounded-full bg-border/30" />
                <div className="w-10 h-2.5 rounded bg-border/20" />
            </div>
        );
    }

    if (balance.is_unlimited) {
        return (
            <Link
                to="/credits"
                className="hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
                title="Unlimited credits (admin)"
            >
                <InfinityIcon className="w-3.5 h-3.5" />
                <span>Unlimited</span>
            </Link>
        );
    }

    const pct = balance.total_granted > 0
        ? (balance.remaining / balance.total_granted) * 100
        : 0;

    const colorClass =
        pct <= 10
            ? "border-red-500/40 bg-red-500/10 text-red-500 dark:text-red-400"
            : pct <= 25
            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border-emerald-600/30 bg-emerald-600/8 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/30";

    return (
        <Link
            to="/credits"
            className={`hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-xs font-semibold transition-colors hover:opacity-80 ${colorClass}`}
            title={`${balance.remaining} credits remaining — click to view history`}
        >
            <Zap className="w-3 h-3" />
            <span>{balance.remaining}</span>
            <span className="opacity-60 font-normal">/ {balance.total_granted}</span>
        </Link>
    );
}
