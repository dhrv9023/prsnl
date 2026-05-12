import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

// Initialise Sentry before rendering — captures all unhandled errors.
// Set VITE_SENTRY_DSN in Vercel environment variables for production.
if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN as string,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        // Don't send PII — no user emails or IDs to Sentry
        sendDefaultPii: false,
    });
}

createRoot(document.getElementById("root")!).render(<App />);
