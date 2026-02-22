import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  GitBranch,
  Target,
  Zap,
  RefreshCw,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Evaluate",
    description: "We analyze where you stand — against real hiring signals, not assumptions.",
  },
  {
    icon: Zap,
    title: "Prioritize",
    description: "We identify what actually moves the needle — and ignore the noise.",
  },
  {
    icon: ArrowRight,
    title: "Direct",
    description: "We give you clear next actions — so you stop guessing and start progressing.",
  },
  {
    icon: RefreshCw,
    title: "Adapt",
    description: "As you improve, Kareerist recalibrates your direction — updating priorities based on progress and performance.",
  },
];

export function Features() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32 bg-background relative border-t border-border/40">
      <div className="container max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mb-24"
        >
          <div className="space-y-6">
            <h2 className="heading-display text-4xl md:text-5xl text-foreground">
              How Kareerist Thinks
            </h2>
            <div className="w-24 h-px bg-border/60" />
            <p className="body-large text-lg md:text-xl max-w-2xl font-light">
              Kareerist doesn’t give advice. It evaluates, prioritizes, and guides — the way real hiring systems do.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-border/20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={isHeaderInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              className="group p-8 md:p-12 border-r border-b border-border/20 hover:bg-secondary/20 transition-colors duration-500 relative"
            >
              <div className="flex flex-col h-full justify-between gap-8">
                <div className="flex justify-between items-start">
                  <feature.icon className="w-6 h-6 text-foreground/70 group-hover:text-foreground transition-colors duration-300 stroke-[1.5]" />
                  <span className="text-xs font-mono text-muted-foreground/30">0{index + 1}</span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-medium text-foreground tracking-tight">{feature.title}</h3>
                  <p className="text-base text-muted-foreground/85 leading-relaxed font-light hover:text-muted-foreground transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 flex items-center gap-3 opacity-60">
          <div className="h-px w-8 bg-foreground/30" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Structured around real hiring logic</p>
        </div>
      </div>
    </section>
  );
}