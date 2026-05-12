/**
 * CreditContext — global credit state for the authenticated user.
 *
 * Provides:
 *  - balance: remaining, total_granted, used, is_unlimited, low_credits
 *  - featureCosts: cost + label per feature key
 *  - canUse(feature): boolean check against local balance
 *  - shortfall(feature): how many credits short
 *  - refresh(): re-fetch balance from backend
 *  - isLoading: true during initial fetch
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import {
    apiGetCreditBalance,
    apiGetFeatureCosts,
    type CreditBalance,
    type FeatureCost,
} from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

// ── Feature key type ──────────────────────────────────────────────────────────

export type FeatureKey =
    | "ats_score"
    | "deep_analysis"
    | "hiring_intel"
    | "interview"
    | "cover_letter"
    | "humanize";

// ── Context shape ─────────────────────────────────────────────────────────────

interface CreditContextType {
    balance: CreditBalance | null;
    featureCosts: Record<string, FeatureCost>;
    isLoading: boolean;
    /** Returns true if the user can afford the feature (or is unlimited). */
    canUse: (feature: FeatureKey) => boolean;
    /** Returns how many credits the user is short (0 if they can afford it). */
    shortfall: (feature: FeatureKey) => number;
    /** Re-fetches balance from the backend (call after a feature is used). */
    refresh: () => Promise<void>;
    /** Optimistically subtract credits locally (avoids a round-trip). */
    deductLocal: (feature: FeatureKey) => void;
}

const CreditContext = createContext<CreditContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CreditProvider({ children }: { children: ReactNode }) {
    const auth = useAuthContext();

    const [balance, setBalance] = useState<CreditBalance | null>(null);
    const [featureCosts, setFeatureCosts] = useState<Record<string, FeatureCost>>({});
    const [isLoading, setIsLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!auth.isAuthenticated) return;
        setIsLoading(true);
        try {
            const [bal, costs] = await Promise.all([
                apiGetCreditBalance(),
                apiGetFeatureCosts(),
            ]);
            setBalance(bal);
            setFeatureCosts(costs);
        } catch {
            // Non-fatal — credit UI degrades gracefully
        } finally {
            setIsLoading(false);
        }
    }, [auth.isAuthenticated]);

    // Fetch on login / page load
    useEffect(() => {
        if (auth.isAuthenticated) {
            fetchAll();
        } else {
            setBalance(null);
        }
    }, [auth.isAuthenticated, fetchAll]);

    const canUse = useCallback(
        (feature: FeatureKey): boolean => {
            // While loading, assume user can use (prevents false "insufficient" flash)
            if (!balance) return isLoading;
            if (balance.is_unlimited) return true;
            const cost = featureCosts[feature]?.cost ?? 0;
            return balance.remaining >= cost;
        },
        [balance, featureCosts, isLoading]
    );

    const shortfall = useCallback(
        (feature: FeatureKey): number => {
            if (!balance || balance.is_unlimited) return 0;
            const cost = featureCosts[feature]?.cost ?? 0;
            return Math.max(0, cost - balance.remaining);
        },
        [balance, featureCosts]
    );

    const refresh = useCallback(async () => {
        await fetchAll();
    }, [fetchAll]);

    /** Optimistically subtract credits so the UI updates instantly. */
    const deductLocal = useCallback(
        (feature: FeatureKey) => {
            setBalance((prev) => {
                if (!prev || prev.is_unlimited) return prev;
                const cost = featureCosts[feature]?.cost ?? 0;
                const newRemaining = Math.max(0, prev.remaining - cost);
                return {
                    ...prev,
                    remaining: newRemaining,
                    used: prev.used + cost,
                    low_credits: newRemaining < 20,
                };
            });
        },
        [featureCosts]
    );

    return (
        <CreditContext.Provider
            value={{ balance, featureCosts, isLoading, canUse, shortfall, refresh, deductLocal }}
        >
            {children}
        </CreditContext.Provider>
    );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCreditContext(): CreditContextType {
    const ctx = useContext(CreditContext);
    if (!ctx) throw new Error("useCreditContext must be used within <CreditProvider>");
    return ctx;
}
