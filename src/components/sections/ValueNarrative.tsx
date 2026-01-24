import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export function ValueNarrative() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 md:py-40">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="heading-display text-display-lg md:text-display-xl text-center mb-16">
            A complete career system —
            <br />
            <span className="text-muted-foreground">not isolated tools.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-semibold text-accent">1</span>
              </div>
              <h3 className="font-semibold mb-2">Resume</h3>
              <p className="text-sm text-muted-foreground">
                Analyze, score, and optimize your resume for real hiring standards.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent-teal/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-semibold text-accent-teal">2</span>
              </div>
              <h3 className="font-semibold mb-2">Interview</h3>
              <p className="text-sm text-muted-foreground">
                Practice with AI simulations and get readiness insights.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-accent-rose/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-semibold text-accent-rose">3</span>
              </div>
              <h3 className="font-semibold mb-2">Clarity</h3>
              <p className="text-sm text-muted-foreground">
                Follow a personalized roadmap to your dream career.
              </p>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="text-center text-muted-foreground mt-16 text-lg"
          >
            Minimal effort. High signal. Designed for real outcomes.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}