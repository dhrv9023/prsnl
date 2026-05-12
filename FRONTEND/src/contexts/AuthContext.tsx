/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Server } from "lucide-react";

// The shape of the auth context matches useAuth's return type
type AuthContextType = ReturnType<typeof useAuth>;

const AuthContext = createContext<AuthContextType | null>(null);

// ── Cold Start Banner ─────────────────────────────────────────────────────────
// Shows after 4 seconds of the initial auth check to warn users about
// Render's free-tier cold start (~30s first load after 15min idle).

function ColdStartBanner({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-2 fade-in duration-500">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-background/95 backdrop-blur-sm shadow-lg shadow-black/20 text-sm">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                    <p className="font-semibold text-foreground/80 leading-none mb-0.5">Waking up the server…</p>
                    <p className="text-xs text-muted-foreground/50">First load takes ~20s on free tier. Hang tight.</p>
                </div>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400/60 flex-shrink-0" />
            </div>
        </div>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const auth = useAuth();
    const [showColdStart, setShowColdStart] = useState(false);

    // Show cold start banner if the initial auth check takes more than 4 seconds
    useEffect(() => {
        if (!auth.isLoading) {
            setShowColdStart(false);
            return;
        }
        const timer = setTimeout(() => {
            if (auth.isLoading) setShowColdStart(true);
        }, 4000);
        return () => clearTimeout(timer);
    }, [auth.isLoading]);

    return (
        <AuthContext.Provider value={auth}>
            {children}
            <ColdStartBanner visible={showColdStart} />
        </AuthContext.Provider>
    );
}

export function useAuthContext(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuthContext must be used within <AuthProvider>");
    return ctx;
}
