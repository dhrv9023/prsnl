import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="cta" className="py-24 md:py-32">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="heading-display text-display-lg mb-6">
            Ready to build your career
            <br />
            <span className="text-muted-foreground">with confidence?</span>
          </h2>
          <p className="body-large mb-10">
            Join thousands of students and professionals who stopped guessing and started building.
          </p>
          <motion.a
            href="#"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-premium inline-flex h-14 px-8 text-base bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20"
          >
            Join Kareerist
            <ArrowRight className="w-4 h-4" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}