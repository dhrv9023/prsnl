import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const principles = [
  {
    title: "Signal Over Noise",
    description: "We focus only on what hiring decisions actually depend on.",
  },
  {
    title: "Structure Over Chaos",
    description: "Your progress lives inside a coherent framework — not disconnected actions.",
  },
  {
    title: "Clarity Over Guesswork",
    description: "Every recommendation exists to reduce uncertainty.",
  },
  {
    title: "Progress Over Activity",
    description: "We measure what moves outcomes — not busy work.",
  },
];

export function ValueNarrative() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 md:py-48 bg-background relative overflow-hidden">
      <div className="container max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto text-center mb-32"
        >
          <h2 className="heading-display text-5xl md:text-7xl mb-8">
            Careers aren’t built
            <br />
            with tools.
          </h2>
          <p className="body-large text-xl md:text-2xl max-w-3xl mx-auto font-light">
            Kareerist brings structure to career growth — replacing scattered effort with a unified, evolving system.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-border/20">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: "easeOut" }}
              className="relative p-8 md:p-10 border-b md:border-b-0 border-border/20 md:border-r last:border-r-0 group hover:bg-secondary/10 transition-colors duration-500"
            >
              <div className="space-y-6">
                <span className="text-xs font-mono text-muted-foreground/40 block">0{index + 1}</span>
                <h3 className="text-lg font-medium text-foreground tracking-tight">{principle.title}</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed font-light group-hover:text-muted-foreground transition-colors duration-300">
                  {principle.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-24 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30 font-medium">
            Built for outcomes — not activity
          </p>
        </motion.div>
      </div>
    </section>
  );
}