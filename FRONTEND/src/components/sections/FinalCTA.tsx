import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/ui/AuthModal";

export function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleStartAnalysis = () => {
    if (auth.isAuthenticated) {
      navigate("/resume-analysis");
    } else {
      sessionStorage.setItem("redirectAfterLogin", "/resume-analysis");
      setShowAuthModal(true);
    }
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 -z-10" />
      <div className="container text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="heading-display text-display-md mb-6">
            Start operating with clarity.
          </h2>
          <p className="body-large text-muted-foreground mb-10 max-w-2xl mx-auto">
            Kareerist brings structure to career growth — aligning your profile, preparation, and direction inside one intelligent system.
          </p>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleStartAnalysis}
              className="inline-flex items-center justify-center h-14 px-8 text-base rounded-full group bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Start Free Analysis
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-xs uppercase tracking-widest text-muted-foreground/80 font-medium">
              100 Free Credits • Designed Around Real Hiring Standards
            </p>
          </div>
        </motion.div>
      </div>

      {/* Auth modal — shown when unauthenticated user clicks Enter Kareerist */}
      {showAuthModal && !auth.isAuthenticated && (
        <AuthModal
          onSuccess={() => {
            setShowAuthModal(false);
            const redirectTo = sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
            sessionStorage.removeItem("redirectAfterLogin");
            navigate(redirectTo);
          }}
          onClose={() => {
            setShowAuthModal(false);
            sessionStorage.removeItem("redirectAfterLogin");
          }}
          login={auth.login}
          signup={auth.signup}
          loginWithGoogle={auth.loginWithGoogle}
          isSubmitting={auth.isSubmitting}
          error={auth.error}
          clearError={auth.clearError}
        />
      )}
    </section>
  );
}
