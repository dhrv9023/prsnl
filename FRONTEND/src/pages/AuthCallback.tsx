import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { apiExchangeOAuthSession } from "@/lib/api";
import { SUPABASE_CODE_VERIFIER_KEY } from "@/lib/supabase";

/** Exponential backoff: attempt up to maxRetries times before giving up. */
async function exchangeWithRetry(
    code: string,
    verifier: string,
    maxRetries = 4,
    baseDelayMs = 600
): Promise<{ msg: string; user: { id: string; email: string } }> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await apiExchangeOAuthSession(code, verifier);
        } catch (err) {
            lastErr = err;
            if (attempt < maxRetries) {
                // Exponential backoff: 600ms, 1.2s, 2.4s, 4.8s
                await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
            }
        }
    }
    throw lastErr;
}

export default function AuthCallback() {
    const { setAuthUser } = useAuthContext();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "retrying" | "error">("loading");
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const hasRun = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invoke
        if (hasRun.current) return;
        hasRun.current = true;

        let active = true;

        async function finish() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const oauthError = params.get("error_description") || params.get("error");

            if (oauthError) {
                if (active) { setError(oauthError); setStatus("error"); }
                return;
            }
            if (!code) {
                if (active) {
                    setError("Google sign-in returned without an authorization code.");
                    setStatus("error");
                }
                return;
            }

            let verifier = window.localStorage.getItem(SUPABASE_CODE_VERIFIER_KEY);
            if (!verifier) {
                if (active) {
                    setError("Session verifier missing. Please try signing in again.");
                    setStatus("error");
                }
                return;
            }
            verifier = verifier.replace(/^"|"$/g, "");

            try {
                if (active) setStatus("retrying");
                const res = await exchangeWithRetry(code, verifier);
                window.localStorage.removeItem(SUPABASE_CODE_VERIFIER_KEY);

                // OAuth code is single-use — it's now consumed. Use setAuthUser to
                // populate the auth context directly from the exchange result.
                if (active) {
                    setAuthUser(res.user);
                    navigate("/dashboard", { replace: true });
                }
            } catch (err: unknown) {
                if (active) {
                    const msg = err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
                    setError(msg);
                    setStatus("error");
                }
            }
        }

        finish();
        return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempt]);

    const handleRetry = () => {
        setStatus("loading");
        setError("");
        hasRun.current = false;
        setAttempt((n) => n + 1);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
            <div className="w-full max-w-sm rounded-lg border border-border/40 bg-card p-6 text-center space-y-4">
                {status === "error" ? (
                    <>
                        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                        <p className="text-sm text-destructive">{error}</p>
                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                onClick={handleRetry}
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" /> Try Again
                            </button>
                            <button
                                onClick={() => navigate("/", { replace: true })}
                                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                            >
                                Back to home
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground">
                            {status === "retrying" ? "Connecting to server…" : "Completing sign-in…"}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
