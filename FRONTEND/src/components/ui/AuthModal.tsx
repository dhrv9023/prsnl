import { useState, useEffect } from "react";
import { Loader2, X, Mail, Lock, User, ArrowRight, AlertTriangle } from "lucide-react";

interface AuthModalProps {
    /** Called when auth succeeds. Parent can close the modal or react. */
    onSuccess: () => void;
    /** Called when the user dismisses the modal (optional). */
    onClose?: () => void;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (email: string, password: string, name?: string) => Promise<boolean>;
    isSubmitting: boolean;
    error: string;
    clearError: () => void;
}

export function AuthModal({
    onSuccess,
    onClose,
    login,
    signup,
    isSubmitting,
    error,
    clearError,
}: AuthModalProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    // Clear error when switching modes or typing
    useEffect(() => { clearError(); }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let ok = false;
        if (mode === "login") {
            ok = await login(email, password);
        } else {
            ok = await signup(email, password, name || undefined);
        }
        if (ok) onSuccess();
    };

    const toggle = () => {
        setMode((m) => (m === "login" ? "signup" : "login"));
        setEmail(""); setPassword(""); setName("");
    };

    return (
        /* ── Backdrop ── */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            {/* ── Modal Card ── */}
            <div className="relative w-full max-w-md mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-full text-muted-foreground hover:bg-secondary/80 hover:text-foreground transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {/* Top gradient accent */}
                <div className="h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

                <div className="p-8 space-y-7">
                    {/* Header */}
                    <div className="space-y-1">
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Kareerist Studio
                        </p>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            {mode === "login" ? "Welcome back" : "Create account"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {mode === "login"
                                ? "Sign in to run resume analysis."
                                : "Sign up to start using Resume Intelligence."}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full name – signup only */}
                        {mode === "signup" && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                required
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                required
                                minLength={6}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {mode === "login" ? "Sign In" : "Create Account"}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle mode */}
                    <p className="text-center text-sm text-muted-foreground">
                        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={toggle}
                            className="text-foreground font-medium hover:underline underline-offset-2 transition-colors"
                        >
                            {mode === "login" ? "Sign up" : "Sign in"}
                        </button>
                    </p>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/30 to-transparent" />
            </div>
        </div>
    );
}
