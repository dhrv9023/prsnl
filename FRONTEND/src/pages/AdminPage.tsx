import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Cookie,
    Database,
    FileText,
    Gauge,
    KeyRound,
    Loader2,
    Lock,
    ShieldCheck,
    Sparkles,
    Upload,
} from "lucide-react";

const securityControls = [
    { name: "HttpOnly cookie auth", status: "Active", icon: Cookie, tone: "emerald" },
    { name: "CSRF origin checks", status: "Active", icon: ShieldCheck, tone: "emerald" },
    { name: "Feature rate limits", status: "Active", icon: Gauge, tone: "emerald" },
    { name: "PDF upload hardening", status: "Active", icon: Upload, tone: "emerald" },
    { name: "Prompt injection guardrails", status: "Active", icon: Sparkles, tone: "emerald" },
    { name: "Role-based admin access", status: "Pending", icon: Lock, tone: "amber" },
];

const envItems = [
    { key: "GROQ_API_KEY", side: "Backend", purpose: "Resume analysis, cover letters, interviews" },
    { key: "HUGGINGFACE_API_KEY", side: "Backend", purpose: "Embedding-based ATS match score" },
    { key: "SUPABASE_URL", side: "Backend", purpose: "Supabase project URL" },
    { key: "SUPABASE_SERVICE_ROLE", side: "Backend", purpose: "Backend database and storage access" },
    { key: "SUPABASE_ANON_KEY", side: "Backend", purpose: "OAuth code exchange" },
    { key: "SUPABASE_JWT_SECRET", side: "Backend", purpose: "Verified user-aware rate-limit key" },
    { key: "CORS_ORIGINS", side: "Backend", purpose: "Allowed frontend origins" },
    { key: "VITE_SUPABASE_URL", side: "Frontend", purpose: "Browser OAuth client URL" },
    { key: "VITE_SUPABASE_ANON_KEY", side: "Frontend", purpose: "Browser OAuth public key" },
];

const rateLimits = [
    ["Auth", "RATE_LIMIT_AUTH", "5/minute"],
    ["Upload", "RATE_LIMIT_UPLOAD", "5/day"],
    ["Analysis", "RATE_LIMIT_ANALYSIS", "2/hour"],
    ["Cover letter", "RATE_LIMIT_COVER_LETTER", "2/hour"],
    ["Interview", "RATE_LIMIT_INTERVIEW", "2/hour"],
    ["ATS", "RATE_LIMIT_ATS", "2/hour"],
];

const supabaseChecklist = [
    "Enable Google provider in Supabase Auth.",
    "Set Site URL to http://localhost:8080 for local development.",
    "Add http://localhost:8080/auth/callback as an allowed redirect URL.",
    "Apply the profiles auth-sync migration.",
    "Keep service_role and JWT secret only in backend env.",
];

function StatusPill({ status, tone }: { status: string; tone: string }) {
    const cls = tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
        : "border-amber-400/20 bg-amber-400/10 text-amber-300";
    return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function SectionHeader({ icon: Icon, label, title }: { icon: typeof ShieldCheck; label: string; title: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/15">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">{label}</p>
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            </div>
        </div>
    );
}

export default function AdminPage() {
    const auth = useAuthContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="pt-24 pb-16">
                <div className="container max-w-6xl space-y-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/30 bg-secondary/20 px-3 py-1 text-xs text-muted-foreground">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                Operations Console
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground/70">
                                Security, auth, and launch-readiness controls for the Kareerist MVP.
                            </p>
                        </div>

                        <Link
                            to="/dashboard"
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-border/40 bg-card px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                    </div>

                    <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                            <div>
                                <p className="text-sm font-medium text-amber-200">Admin access is currently auth-gated only.</p>
                                <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
                                    This page is useful for MVP operations, but a real production admin panel should check a server-side role such as `profiles.is_admin`.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg border border-border/25 bg-card/60 p-5">
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Auth Mode</p>
                            <div className="mt-3 flex items-center gap-2">
                                <Cookie className="h-5 w-5 text-emerald-300" />
                                <p className="text-lg font-semibold">HttpOnly Cookies</p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-border/25 bg-card/60 p-5">
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Local Origin</p>
                            <div className="mt-3 flex items-center gap-2">
                                <Lock className="h-5 w-5 text-blue-300" />
                                <p className="text-lg font-semibold">localhost:8080</p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-border/25 bg-card/60 p-5">
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Upload Limit</p>
                            <div className="mt-3 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-purple-300" />
                                <p className="text-lg font-semibold">5MB PDF</p>
                            </div>
                        </div>
                    </div>

                    <section className="rounded-lg border border-border/25 bg-card/60 p-5">
                        <SectionHeader icon={ShieldCheck} label="Security" title="Implemented Controls" />
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {securityControls.map((item) => (
                                <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/10 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <StatusPill status={item.status} tone={item.tone} />
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="rounded-lg border border-border/25 bg-card/60 p-5">
                            <SectionHeader icon={KeyRound} label="Environment" title="Required Configuration" />
                            <div className="mt-5 overflow-hidden rounded-lg border border-border/20">
                                {envItems.map((item) => (
                                    <div key={item.key} className="grid gap-2 border-b border-border/15 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_100px_1.4fr]">
                                        <code className="text-xs text-foreground">{item.key}</code>
                                        <span className="text-xs text-muted-foreground">{item.side}</span>
                                        <span className="text-xs text-muted-foreground/80">{item.purpose}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-lg border border-border/25 bg-card/60 p-5">
                            <SectionHeader icon={Database} label="Supabase" title="Google Auth Checklist" />
                            <div className="mt-5 space-y-3">
                                {supabaseChecklist.map((item) => (
                                    <div key={item} className="flex gap-3 rounded-lg bg-secondary/10 px-3 py-2.5">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                                        <p className="text-sm text-muted-foreground/85">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-lg border border-border/25 bg-card/60 p-5">
                        <SectionHeader icon={Clock3} label="Limits" title="Current Rate Limit Defaults" />
                        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {rateLimits.map(([feature, key, value]) => (
                                <div key={key} className="rounded-lg border border-border/20 bg-secondary/10 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-sm font-semibold">{feature}</p>
                                        <Gauge className="h-4 w-4 text-muted-foreground/60" />
                                    </div>
                                    <code className="block text-xs text-muted-foreground">{key}</code>
                                    <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
