import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Loader2 } from "lucide-react";

// ── Schemas ────────────────────────────────────────────

const loginSchema = z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
});

const signupSchema = z.object({
    fullName: z.string().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

// ── Page ───────────────────────────────────────────────

export default function AuthPage() {
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, signup, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: string })?.from || "/";

    // If already authenticated, redirect
    if (isAuthenticated) {
        navigate(from, { replace: true });
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow flex items-center justify-center px-4 pt-24 pb-16">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="heading-display text-3xl md:text-4xl">
                            {mode === "login" ? "Welcome back." : "Create your account."}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {mode === "login"
                                ? "Sign in to access your career tools."
                                : "Join Kareerist to start building your career."}
                        </p>
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                            {success}
                        </div>
                    )}

                    {/* Form */}
                    {mode === "login" ? (
                        <LoginForm
                            isSubmitting={isSubmitting}
                            onSubmit={async (vals) => {
                                setError("");
                                setIsSubmitting(true);
                                try {
                                    await login(vals.email, vals.password);
                                    navigate(from, { replace: true });
                                } catch (e: any) {
                                    setError(e.message || "Login failed");
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                        />
                    ) : (
                        <SignupForm
                            isSubmitting={isSubmitting}
                            onSubmit={async (vals) => {
                                setError("");
                                setSuccess("");
                                setIsSubmitting(true);
                                try {
                                    await signup(vals.email, vals.password, vals.fullName);
                                    setSuccess("Account created! Check your email, then sign in.");
                                    setMode("login");
                                } catch (e: any) {
                                    setError(e.message || "Signup failed");
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }}
                        />
                    )}

                    {/* Toggle */}
                    <p className="text-center text-sm text-muted-foreground">
                        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                        <button
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError("");
                                setSuccess("");
                            }}
                            className="text-foreground font-medium hover:underline underline-offset-4"
                        >
                            {mode === "login" ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────

function LoginForm({
    onSubmit,
    isSubmitting,
}: {
    onSubmit: (v: LoginValues) => void;
    isSubmitting: boolean;
}) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Email
                </label>
                <input
                    type="email"
                    {...register("email")}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-lg px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                    placeholder="you@example.com"
                />
                {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Password
                </label>
                <input
                    type="password"
                    {...register("password")}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-lg px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                    placeholder="••••••••"
                />
                {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        Sign In <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}

function SignupForm({
    onSubmit,
    isSubmitting,
}: {
    onSubmit: (v: SignupValues) => void;
    isSubmitting: boolean;
}) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Full Name
                </label>
                <input
                    type="text"
                    {...register("fullName")}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-lg px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                    placeholder="Jane Doe"
                />
                {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Email
                </label>
                <input
                    type="email"
                    {...register("email")}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-lg px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                    placeholder="you@example.com"
                />
                {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Password
                </label>
                <input
                    type="password"
                    {...register("password")}
                    className="w-full h-12 bg-secondary/50 border border-border rounded-lg px-4 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                    placeholder="Min 6 characters"
                />
                {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <>
                        Create Account <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    );
}
