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
    const [honeypot, setHoneypot] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);

    // Fix: Lock body scroll on mobile when modal is open so the background
    // doesn't scroll behind the backdrop on touch devices.
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    // Cooldown countdown timer
    useEffect(() => {
        if (cooldownRemaining > 0) {
            const t = setInterval(() => setCooldownRemaining((c) => Math.max(0, c - 1)), 1000);
            return () => clearInterval(t);
        }
    }, [cooldownRemaining]);

    // Clear error & reset submission state when mounting or switching modes
    useEffect(() => {
        clearError();
        setFieldErrors({});
    }, [mode, clearError]);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            errors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            errors.email = "Please enter a valid email address.";
        }

        if (!password) {
            errors.password = "Password is required.";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters.";
        }

        if (mode === "signup" && (!name || name.trim().length < 2)) {
            errors.name = "Full name must be at least 2 characters.";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Spam bot honeypot trap
        if (honeypot.trim().length > 0) {
            onSuccess();
            return;
        }

        // Attempt throttling
        if (cooldownRemaining > 0) {
            return;
        }

        if (!validate()) {
            return;
        }

        let ok = false;
        if (mode === "login") {
            ok = await login(email.trim(), password);
        } else {
            ok = await signup(email.trim(), password, name.trim() || undefined);
        }

        if (ok) {
            setFailedAttempts(0);
            onSuccess();
        } else {
            const nextAttempts = failedAttempts + 1;
            setFailedAttempts(nextAttempts);
            if (nextAttempts >= 5) {
                setCooldownRemaining(30);
            }
        }
    };

    const toggle = () => {
        clearError();
        setFieldErrors({});
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
                        {/* Bot honeypot trap */}
                        <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
                            <label htmlFor="auth_bot_trap">Do not fill</label>
                            <input
                                type="text"
                                id="auth_bot_trap"
                                name="auth_bot_trap"
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                            />
                        </div>

                        {/* Cooldown banner */}
                        {cooldownRemaining > 0 && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Too many attempts. Please wait {cooldownRemaining}s before trying again.</span>
                            </div>
                        )}

                        {/* Full name – signup only */}
                        {mode === "signup" && (
                            <div className="space-y-1">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
                                    <input
                                        type="text"
                                        placeholder="Full name"
                                        value={name}
                                        disabled={isSubmitting || cooldownRemaining > 0}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (fieldErrors.name) setFieldErrors(p => ({ ...p, name: "" }));
                                        }}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.name ? "border-destructive" : "border-border/40 focus:border-foreground/20"}`}
                                    />
                                </div>
                                {fieldErrors.name && (
                                    <p className="text-xs text-destructive pl-1">{fieldErrors.name}</p>
                                )}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-1">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    required
                                    disabled={isSubmitting || cooldownRemaining > 0}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: "" }));
                                    }}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.email ? "border-destructive" : "border-border/40 focus:border-foreground/20"}`}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="text-xs text-destructive pl-1">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
                                <input
                                    type="password"
                                    placeholder="Password (min. 6 characters)"
                                    value={password}
                                    required
                                    minLength={6}
                                    disabled={isSubmitting || cooldownRemaining > 0}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: "" }));
                                    }}
                                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg bg-secondary/40 border text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${fieldErrors.password ? "border-destructive" : "border-border/40 focus:border-foreground/20"}`}
                                />
                            </div>
                            {fieldErrors.password && (
                                <p className="text-xs text-destructive pl-1">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Backend Error */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting || cooldownRemaining > 0}
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

