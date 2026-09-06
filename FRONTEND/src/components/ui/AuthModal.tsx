import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, X, Mail, Lock, User, ArrowRight, AlertTriangle, Chrome } from "lucide-react";

interface AuthModalProps {
    /** Called when auth succeeds. Parent can close the modal or react. */
    onSuccess: () => void;
    /** Called when the user dismisses the modal (optional). */
    onClose?: () => void;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (email: string, password: string, name?: string) => Promise<boolean>;
    loginWithGoogle: () => Promise<boolean>;
    isSubmitting: boolean;
    error: string;
    clearError: () => void;
}

export function AuthModal({
    onSuccess,
    onClose,
    login,
    signup,
    loginWithGoogle,
    isSubmitting,
    error,
    clearError,
}: AuthModalProps) {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    // Fix: Lock body scroll on mobile when modal is open so the background
    // doesn't scroll behind the backdrop on touch devices.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Clear error & reset submission state when mounting or switching modes
    useEffect(() => {
        clearError();
    }, [mode, clearError]);


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
        clearError();
        setMode((m) => (m === "login" ? "signup" : "login"));
        setEmail(""); setPassword(""); setName("");
    };

    const handleClose = () => {
        clearError();
        if (onClose) onClose();
    };

    const modalContent = (
        /* ── Backdrop ── */
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            {/* ── Modal Card ── */}
            <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={handleClose}
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
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={loginWithGoogle}
                            disabled={isSubmitting}
                            className="w-full h-11 bg-background border border-border/50 text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
                            Continue with Google
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-border/40" />
                            <span className="text-xs text-muted-foreground/60">or</span>
                            <div className="h-px flex-1 bg-border/40" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full name – signup only */}
                        {mode === "signup" && (
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={name}
                                    disabled={isSubmitting}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={isSubmitting}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                disabled={isSubmitting}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={isSubmitting}
                            className="text-foreground font-medium hover:underline underline-offset-2 transition-colors disabled:opacity-50"
                        >
                            {mode === "login" ? "Sign up" : "Sign in"}
                        </button>
                    </p>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/30 to-transparent" />
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

