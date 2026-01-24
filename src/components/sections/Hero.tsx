import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 gradient-subtle dark:gradient-subtle-dark" />
      
      {/* Geometric accents */}
      <div className="absolute top-1/4 right-[15%] w-64 h-64 rounded-full border border-border/30 opacity-50 animate-float" />
      <div className="absolute bottom-1/4 left-[10%] w-48 h-48 rounded-full border border-accent/20 opacity-40 animate-float animation-delay-200" />
      <div className="absolute top-1/3 left-[20%] w-2 h-2 rounded-full bg-accent/60" />
      <div className="absolute bottom-1/3 right-[25%] w-3 h-3 rounded-full bg-accent-teal/40" />

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary/80 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              AI-Powered Career Intelligence
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="heading-display text-display-xl mb-8"
          >
            Stop Guessing
            <br />
            <span className="text-muted-foreground">Your Career.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="body-large max-w-2xl mx-auto mb-12"
          >
            Kareerist uses intelligent systems to analyze your profile, simulate real hiring standards, and guide your career with clarity — not confusion.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#cta"
              className="btn-premium h-14 px-8 text-base bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent" />
              Built for real hiring outcomes
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent-teal" />
              One profile → Clear direction
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-accent-rose" />
              Trusted by 10,000+ users
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}