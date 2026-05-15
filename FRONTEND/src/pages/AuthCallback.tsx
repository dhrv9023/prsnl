import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AuthCallback() {
    const { completeOAuthLogin } = useAuthContext();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "error">("loading");
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const hasRun = useRef(false);

    useEffect(() => {
        // Guard against React StrictMode double-invoke
        if (hasRun.current) return;
        hasRun.current = true;

        async function finish() {
            // ✅ Read params BEFORE cleaning URL
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const oauthError = params.get("error_description") || params.get("error");

            // ✅ Clean URL immediately after reading (security)
            window.history.replaceState({}, "", window.location.pathname);

            if (oauthError) {
                console.error("[AuthCallback] OAuth error from provider:", oauthError);
                setError(oauthError);
                setStatus("error");
                return;
            }
            if (!code) {
                console.error("[AuthCallback] No authorization code in URL");
                setError("Google sign-in returned without an authorization code.");
                setStatus("error");
                return;
            }

            console.log("[AuthCallback] Exchanging code for session...");
            const success = await completeOAuthLogin(code);
            if (success) {
                // Check for redirect intent
                const redirectTo = sessionStorage.getItem("redirect_after_login");
                sessionStorage.removeItem("redirect_after_login");
                navigate(redirectTo || "/dashboard", { replace: true });
            } else {
                setError("Google sign-in failed. Please try again.");
                setStatus("error");
            }
        }

        finish();
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
                            Completing sign-in…
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
