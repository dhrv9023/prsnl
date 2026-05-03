import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AuthCallback() {
    const { completeOAuthLogin } = useAuthContext();
    const navigate = useNavigate();
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function finish() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            const oauthError = params.get("error_description") || params.get("error");

            if (oauthError) {
                if (active) setError(oauthError);
                return;
            }
            if (!code) {
                if (active) setError("Google sign-in returned without an authorization code.");
                return;
            }

            const ok = await completeOAuthLogin(code);
            if (active) navigate(ok ? "/dashboard" : "/", { replace: true });
        }

        finish();
        return () => { active = false; };
    }, [completeOAuthLogin, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
            <div className="w-full max-w-sm rounded-lg border border-border/40 bg-card p-6 text-center space-y-4">
                {error ? (
                    <>
                        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                        <p className="text-sm text-destructive">{error}</p>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
                    </>
                )}
            </div>
        </div>
    );
}
