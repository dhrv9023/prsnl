/**
 * CreditBadge — compact credit balance pill shown in the Navbar.
 *
 * Shows: remaining / cap  (e.g. "45 / 50")
 * Color: green → amber → red as credits deplete.
 * Clicking navigates to /credits page.
 */

import { Zap, Infinity as InfinityIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreditContext } from "@/contexts/CreditContext";

export function CreditBadge() {
    const { balance, isLoading } = useCreditContext();
    const navigate = useNavigate();

    // Still loading — show a subtle skeleton pill
    if (isLoading) {
        return (
            <div className="h-7 w-20 rounded-full bg-secondary/40 animate-pulse" />
        );
    }

    if (!balance) return null;

    // Admin / unlimited account
    if (balance.is_unlimited) {
        return (
            <button
                onClick={() => navigate("/credits")}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
                <InfinityIcon className="w-3.5 h-3.5" />
                Unlimited
            </button>
        );
    }

    // After initial 100 credits are used, denominator becomes 50 (daily cap)
    const isInDailyMode = balance.total_granted > 100;
    const cap = isInDailyMode ? 50 : balance.total_granted;
    const remaining = balance.remaining;
    const pct = cap > 0 ? Math.min(100, (remaining / cap) * 100) : 0;

    // Color based on percentage remaining
    const colorClass =
        pct <= 10
            ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : pct <= 25
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20";

    return (
        <button
            onClick={() => navigate("/credits")}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-xs font-semibold transition-colors ${colorClass}`}
            title={`${remaining} credits remaining — click to manage`}
        >
            <Zap className="w-3 h-3" />
            {remaining}
            <span className="text-[10px] font-normal opacity-60">/ {cap}</span>
        </button>
    );
}
