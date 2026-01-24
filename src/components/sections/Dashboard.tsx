import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingUp, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

export function Dashboard() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-32 bg-secondary/30">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="heading-display text-display-lg mb-6">
            Your command center
          </h2>
          <p className="body-large max-w-xl mx-auto">
            Track progress, identify gaps, and take action — all from one intelligent dashboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="dashboard-preview max-w-5xl mx-auto p-6 md:p-8"
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Good morning</p>
              <h3 className="text-xl font-semibold">Your Career Overview</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Last updated today
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Resume Score */}
            <div className="bg-background/60 rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Resume Score</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold">87</span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-[87%] bg-accent rounded-full" />
              </div>
            </div>

            {/* Interview Readiness */}
            <div className="bg-background/60 rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Interview Ready</span>
                <CheckCircle2 className="w-4 h-4 text-accent-teal" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold">72</span>
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-[72%] bg-accent-teal rounded-full" />
              </div>
            </div>

            {/* Career Path */}
            <div className="bg-background/60 rounded-xl p-5 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Path Progress</span>
                <ArrowUpRight className="w-4 h-4 text-accent-rose" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold">4</span>
                <span className="text-sm text-muted-foreground">/6 steps</span>
              </div>
              <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full w-[66%] bg-accent-rose rounded-full" />
              </div>
            </div>
          </div>

          {/* Suggestions Panel */}
          <div className="bg-background/60 rounded-xl p-5 border border-border/50">
            <h4 className="text-sm font-medium mb-4">Recommended Actions</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-accent" />
                <span>Add measurable achievements to your experience section</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-accent-teal" />
                <span>Complete 2 more mock interviews to unlock advanced feedback</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 text-accent-rose" />
                <span>Review the "Technical Skills" module in your roadmap</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}