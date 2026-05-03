import { useState, useEffect, useCallback } from "react";
import {
    apiGetMe,
    apiLogin,
    apiSignup,
    apiLogout,
    apiExchangeOAuthSession,
    AuthUser,
} from "@/lib/api";
import { SUPABASE_CODE_VERIFIER_KEY, isSupabaseOAuthConfigured, supabase } from "@/lib/supabase";

interface AuthState {
    user: AuthUser | null;
    isLoading: boolean;      // true while the initial /auth/me check is in-flight
    isSubmitting: boolean;   // true during login/signup actions
    error: string;
}

function extractError(e: unknown, fallback: string): string {
    if (e instanceof Error) return e.message || fallback;
    if (typeof e === "string") return e;
    return fallback;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isSubmitting: false,
        error: "",
    });

    // ── On mount: check if a valid session cookie already exists ─────────────
    useEffect(() => {
        apiGetMe()
            .then((me) => setState({ user: { id: me.id, email: me.email }, isLoading: false, isSubmitting: false, error: "" }))
            .catch(() => setState({ user: null, isLoading: false, isSubmitting: false, error: "" }));
    }, []);

    // ── Login ────────────────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string) => {
        setState((s) => ({ ...s, isSubmitting: true, error: "" }));
        try {
            const res = await apiLogin(email, password);
            setState({ user: res.user, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = extractError(e, "Invalid email or password. Please try again.");
            setState((s) => ({ ...s, isSubmitting: false, error: msg }));
            return false;
        }
    }, []);

    // ── Signup ───────────────────────────────────────────────────────────────
    const signup = useCallback(async (email: string, password: string, name?: string) => {
        setState((s) => ({ ...s, isSubmitting: true, error: "" }));
        try {
            await apiSignup(email, password, name);
            // Auto-login after successful signup
            const res = await apiLogin(email, password);
            setState({ user: res.user, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = extractError(e, "Signup failed. Please try again.");
            setState((s) => ({ ...s, isSubmitting: false, error: msg }));
            return false;
        }
    }, []);

    // ── Google OAuth via Supabase PKCE ───────────────────────────────────────
    const loginWithGoogle = useCallback(async () => {
        setState((s) => ({ ...s, isSubmitting: true, error: "" }));
        if (!supabase || !isSupabaseOAuthConfigured) {
            setState((s) => ({
                ...s,
                isSubmitting: false,
                error: "Google sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
            }));
            return false;
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        });

        if (error) {
            setState((s) => ({ ...s, isSubmitting: false, error: error.message }));
            return false;
        }
        return true;
    }, []);

    const completeOAuthLogin = useCallback(async (code: string) => {
        setState((s) => ({ ...s, isSubmitting: true, error: "" }));
        try {
            const verifier = window.localStorage.getItem(SUPABASE_CODE_VERIFIER_KEY);
            if (!verifier) throw new Error("OAuth verifier missing. Please try Google sign-in again.");

            const res = await apiExchangeOAuthSession(code, verifier);
            window.localStorage.removeItem(SUPABASE_CODE_VERIFIER_KEY);
            setState({ user: res.user, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = extractError(e, "Google sign-in failed. Please try again.");
            setState({ user: null, isLoading: false, isSubmitting: false, error: msg });
            return false;
        }
    }, []);

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        await apiLogout().catch(() => { });
        setState({ user: null, isLoading: false, isSubmitting: false, error: "" });
    }, []);

    // ── Clear error helper ────────────────────────────────────────────────────
    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: "" }));
    }, []);

    return {
        user: state.user,
        isLoading: state.isLoading,
        isSubmitting: state.isSubmitting,
        error: state.error,
        isAuthenticated: !!state.user,
        login,
        signup,
        loginWithGoogle,
        completeOAuthLogin,
        logout,
        clearError,
    };
}
