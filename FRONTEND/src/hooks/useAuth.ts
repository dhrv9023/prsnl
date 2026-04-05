import { useState, useEffect, useCallback } from "react";
import {
    apiGetMe,
    apiLogin,
    apiSignup,
    apiLogout,
    AuthUser,
} from "@/lib/api";

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
        logout,
        clearError,
    };
}
