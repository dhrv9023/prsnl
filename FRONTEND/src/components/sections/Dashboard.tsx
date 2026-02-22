import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  TrendingUp,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Zap,
  ChevronRight,
  Activity
} from "lucide-react";

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
            Live Career Status
          </h2>
          <p className="body-large max-w-xl mx-auto">
            A real-time view of where you stand, what matters, and what moves you forward.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.98 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="dashboard-preview max-w-5xl mx-auto p-8 md:p-10"
        >
          {/* Dashboard Header */}
          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-medium">Command Center</p>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h3>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground bg-secondary/50 px-4 py-2 rounded-full border border-border/50 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Career Model Active
            </div>
          </div>

          {/* Dominant Insight Panel (System Insight) */}
          <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-background/50 backdrop-blur-sm p-8 md:p-10 mb-12 group shadow-[0_0_50px_-20px_rgba(var(--accent-rgb),0.15)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-50 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-60" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="space-y-6 max-w-3xl">
                <div className="flex items-center justify-between md:justify-start gap-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-widest">
                    <Activity className="w-3.5 h-3.5" />
                    System Insight
                  </span>
                </div>

                <div>
                  <h4 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground mb-4">
                    Your biggest unlock right now:
                  </h4>
                  <p className="text-xl text-muted-foreground leading-relaxed font-light">
                    Improving measurable impact in your experience section could raise your resume score by <strong className="text-foreground font-semibold border-b-2 border-accent/20 pb-0.5">+8–12 points</strong>.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs font-semibold text-accent uppercase tracking-wider">
                  Impact Potential: High
                </div>
                <div className="hidden md:flex h-16 w-16 rounded-full bg-accent/5 items-center justify-center border border-accent/10">
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 relative">
            <div className="absolute inset-x-0 bottom-[-24px] h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

            {/* Resume Score */}
            <div className="group relative bg-card hover:bg-card/90 rounded-xl p-8 border border-border/50 hover:border-border/80 transition-all duration-500 hover:-translate-y-1 shadow-sm dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col h-full">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Resume Score</span>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-light tracking-tight text-foreground">87</span>
                  <span className="text-lg text-muted-foreground font-light">/100</span>
                </div>

                <div className="space-y-4">
                  <div className="h-0.5 bg-secondary w-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "87%" } : {}}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-foreground rounded-full"
                    />
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    Strong structure. <span className="text-muted-foreground">Impact clarity needs improvement.</span>
                  </p>

                  <div className="pt-4 flex items-center text-xs font-medium text-accent opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    View Details <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Readiness */}
            <div className="group relative bg-card hover:bg-card/90 rounded-xl p-8 border border-border/50 hover:border-border/80 transition-all duration-500 hover:-translate-y-1 shadow-sm dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col h-full">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Interview Readiness</span>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-light tracking-tight text-foreground">72</span>
                  <span className="text-lg text-muted-foreground font-light">%</span>
                </div>

                <div className="space-y-4">
                  <div className="h-0.5 bg-secondary w-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "72%" } : {}}
                      transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                      className="h-full bg-accent-teal rounded-full"
                    />
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    Behavioral questions are <span className="text-muted-foreground">weaker than technical.</span>
                  </p>

                  <div className="pt-4 flex items-center text-xs font-medium text-accent-teal opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    View Details <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Path Progress */}
            <div className="group relative bg-card hover:bg-card/90 rounded-xl p-8 border border-border/50 hover:border-border/80 transition-all duration-500 hover:-translate-y-1 shadow-sm dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col h-full">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">Path Progress</span>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-5xl font-light tracking-tight text-foreground">4</span>
                  <span className="text-lg text-muted-foreground font-light">/6</span>
                </div>

                <div className="space-y-4">
                  <div className="h-0.5 bg-secondary w-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={isInView ? { width: "66%" } : {}}
                      transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
                      className="h-full bg-accent-rose rounded-full"
                    />
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    <span className="text-foreground">2 critical modules</span> remaining.
                  </p>

                  <div className="pt-4 flex items-center text-xs font-medium text-accent-rose opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    View Details <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Feedback Layer */}
          <div className="flex items-center justify-center gap-3 mb-12 opacity-80">
            <div className="h-px bg-border/40 w-12" />
            <p className="text-sm text-muted-foreground italic font-medium text-center max-w-lg">
              "Your resume strength is above average, but recruiter confidence depends on quantified impact."
            </p>
            <div className="h-px bg-border/40 w-12" />
          </div>

          {/* Priority Stack (Execution Engine) */}
          <div className="space-y-6">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest pl-1">Priority Stack</h4>

            <div className="relative space-y-4">
              {/* Connector Line */}
              <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-border/20 z-0 hidden md:block" />

              {/* High Impact */}
              <div className="group relative z-10 flex flex-col md:flex-row md:items-center gap-6 bg-card hover:bg-card/90 p-6 rounded-xl border border-border/50 hover:border-red-500/30 transition-all duration-300 cursor-pointer shadow-sm dark:shadow-[0_2px_12px_-3px_rgba(0,0,0,0.3)]">
                <div className="flex-shrink-0 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform shadow-[0_0_15px_-4px_rgba(239,68,68,0.3)]">
                    <Zap className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="md:w-32">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">High Impact</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-red-400 font-medium">Critical</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 border-l border-border/30 md:pl-6 pl-0 md:border-l-0">
                  <p className="text-base text-foreground font-medium mb-2 group-hover:text-red-400 transition-colors">Add measurable achievements to experience section</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      15 mins
                    </span>
                    <span className="flex items-center gap-1.5 text-accent">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +8 Score
                    </span>
                  </div>
                </div>

                <ArrowUpRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
              </div>

              {/* Medium */}
              <div className="group relative z-10 flex flex-col md:flex-row md:items-center gap-6 bg-card/80 hover:bg-card p-5 rounded-lg border border-border/50 hover:border-yellow-500/30 transition-all duration-300 cursor-pointer opacity-90 hover:opacity-100 dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.25)]">
                <div className="flex-shrink-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/5 flex items-center justify-center border border-yellow-500/10 group-hover:scale-105 transition-transform">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm" />
                  </div>
                  <div className="md:w-32">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Medium</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 mb-1 group-hover:text-yellow-400 transition-colors">Complete 2 mock interviews to unlock advanced review</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      30 mins
                    </span>
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
              </div>

              {/* Optimization */}
              <div className="group relative z-10 flex flex-col md:flex-row md:items-center gap-6 bg-card/80 hover:bg-card p-5 rounded-lg border border-border/50 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer opacity-90 hover:opacity-100 dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.25)]">
                <div className="flex-shrink-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 group-hover:scale-105 transition-transform">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                  </div>
                  <div className="md:w-32">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Optimization</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 mb-1 group-hover:text-emerald-400 transition-colors">Refine technical skill grouping</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      5 mins
                    </span>
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground/60 transition-colors" />
              </div>
            </div>
          </div>

          {/* Final Reinforcement Line */}
          <div className="mt-16 text-center">
            <p className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors cursor-default">
              Signals update automatically as your profile evolves
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}