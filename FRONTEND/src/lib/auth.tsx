import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";

// ── Types ──────────────────────────────────────────────

interface User {
    id: string;
    email: string;
}

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName?: string) => Promise<void>;
    logout: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

// ── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check auth status on mount
    useEffect(() => {
        apiGet<{ id: string; email: string }>("/auth/me")
            .then((data) => setUser({ id: data.id, email: data.email }))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await apiPost<{ user: User }>("/auth/login", { email, password });
        setUser(data.user);
    }, []);

    const signup = useCallback(
        async (email: string, password: string, fullName?: string) => {
            await apiPost("/auth/signup", {
                email,
                password,
                full_name: fullName || "",
            });
        },
        []
    );

    const logout = useCallback(async () => {
        await apiPost("/auth/logout", {});
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                signup,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ── Route Guard ────────────────────────────────────────

export function RequireAuth({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground text-sm tracking-widest uppercase">
                    Loading...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
    }

    return <>{children}</>;
}
