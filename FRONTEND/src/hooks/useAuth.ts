import { useState, useEffect, useCallback } from "react";
import {
    apiGetMe,
    apiLogin,
    apiSignup,
    apiLogout,
    apiExchangeOAuthSession,
    AuthUser,
} from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { SUPABASE_CODE_VERIFIER_KEY, isSupabaseOAuthConfigured, supabase } from "@/lib/supabase";

interface AuthState {
    user: AuthUser | null;
    isAdmin: boolean;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        isAdmin: false,
        isLoading: true,
        isSubmitting: false,
        error: "",
    });

    // ── On mount: check if a valid session cookie already exists ─────────────
    useEffect(() => {
        apiGetMe()
            .then((me) => setState({ user: { id: me.id, email: me.email }, isAdmin: me.is_admin ?? false, isLoading: false, isSubmitting: false, error: "" }))
            .catch(() => setState({ user: null, isAdmin: false, isLoading: false, isSubmitting: false, error: "" }));
    }, []);

    // ── Login ────────────────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string) => {
        setState((s) => ({ ...s, isSubmitting: true, error: "" }));
        try {
            const res = await apiLogin(email, password);
            // Fetch /me after login to get is_admin flag
            const me = await apiGetMe().catch(() => null);
            setState({ user: res.user, isAdmin: me?.is_admin ?? false, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = friendlyError(e, "Wrong email or password. Please try again.");
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
            const me = await apiGetMe().catch(() => null);
            setState({ user: res.user, isAdmin: me?.is_admin ?? false, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = friendlyError(e, "Signup failed. Please try again.");
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
            let verifier = window.localStorage.getItem(SUPABASE_CODE_VERIFIER_KEY);
            if (!verifier) throw new Error("OAuth verifier missing. Please try Google sign-in again.");

            // Remove quotes if supabase-js stringified it
            verifier = verifier.replace(/^"|"$/g, "");

            const res = await apiExchangeOAuthSession(code, verifier);
            window.localStorage.removeItem(SUPABASE_CODE_VERIFIER_KEY);
            // Fetch /me to get is_admin flag
            const me = await apiGetMe().catch(() => null);
            setState({ user: res.user, isAdmin: me?.is_admin ?? false, isLoading: false, isSubmitting: false, error: "" });
            return true;
        } catch (e: unknown) {
            const msg = friendlyError(e, "Google sign-in failed. Please try again.");
            setState({ user: null, isAdmin: false, isLoading: false, isSubmitting: false, error: msg });
            return false;
        }
    }, []);

    /**
     * Directly set the authenticated user (used by AuthCallback after
     * a successful exchangeWithRetry so we don't re-call the backend
     * with an already-consumed OAuth code).
     */
    const setAuthUser = useCallback((user: AuthUser) => {
        // Fetch /me to get is_admin flag for OAuth users
        apiGetMe()
            .then((me) => setState({ user, isAdmin: me?.is_admin ?? false, isLoading: false, isSubmitting: false, error: "" }))
            .catch(() => setState({ user, isAdmin: false, isLoading: false, isSubmitting: false, error: "" }));
    }, []);

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        await apiLogout().catch(() => { });
        setState({ user: null, isAdmin: false, isLoading: false, isSubmitting: false, error: "" });
    }, []);

    // ── Clear error helper ────────────────────────────────────────────────────
    const clearError = useCallback(() => {
        setState((s) => ({ ...s, error: "" }));
    }, []);

    return {
        user: state.user,
        isAdmin: state.isAdmin,
        isLoading: state.isLoading,
        isSubmitting: state.isSubmitting,
        error: state.error,
        isAuthenticated: !!state.user,
        login,
        signup,
        loginWithGoogle,
        completeOAuthLogin,
        setAuthUser,
        logout,
        clearError,
    };
}
