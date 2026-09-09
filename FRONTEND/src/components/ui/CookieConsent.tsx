import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield, Check, X } from "lucide-react";

export const COOKIE_CONSENT_KEY = "kareerist_cookie_consent";
export const COOKIE_CONSENT_EVENT = "kareerist-cookie-consent-reopen";

export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a decision
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      // Delay slightly for smooth page entrance
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Listen for footer link or settings request to reopen
    const handleReopen = () => {
      setIsOpen(true);
      setDetailsVisible(true);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, handleReopen);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleReopen);
  }, []);

  const handleConsent = (level: "all" | "essential") => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      level,
      timestamp: new Date().toISOString(),
    }));
    window.dispatchEvent(
      new CustomEvent("kareerist-consent-updated", { detail: { level } })
    );
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="dialog"
          aria-live="polite"
          aria-label="Cookie and Privacy Consent"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-5 rounded-2xl bg-card/95 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl text-foreground"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                <Cookie className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
                  Transparency First
                </p>
              </div>
            </div>
            <button
              onClick={() => handleConsent("essential")}
              aria-label="Decline optional cookies"
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-3.5">
            We use strictly essential cookies to keep you signed in securely and protect against CSRF attacks. With your consent, we also use privacy-first analytics to understand feature usage and improve your experience.
          </p>

          {/* Collapsible Details */}
          {detailsVisible && (
            <div className="mb-4 p-3 rounded-xl bg-secondary/40 border border-border/50 text-[11px] space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Essential (Always Active):</span>
                  <p className="text-muted-foreground">Session authentication, security tokens, and credit verification.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-foreground">Analytics (Optional):</span>
                  <p className="text-muted-foreground">Anonymous telemetry, Sentry error diagnosis, and feature adoption metrics.</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              onClick={() => handleConsent("all")}
              className="flex-1 inline-flex items-center justify-center h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              Accept All
            </button>
            <button
              onClick={() => handleConsent("essential")}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/60 text-foreground text-xs font-medium transition-colors"
            >
              Essential Only
            </button>
            {!detailsVisible && (
              <button
                onClick={() => setDetailsVisible(true)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 py-1 px-1 transition-colors text-center"
              >
                Customize
              </button>
            )}
          </div>

          {/* Privacy Link */}
          <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Learn more in our</span>
            <Link
              to="/privacy"
              onClick={() => setIsOpen(false)}
              className="text-foreground hover:text-accent font-medium underline underline-offset-2 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Helper function for triggering the Cookie Consent modal from anywhere (e.g. Footer) */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT));
}
