import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { FileSearch, BarChart3, Mic, Route } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Intelligent Resume Analysis",
    description: "Line-by-line feedback powered by real hiring standards. Understand exactly what recruiters see and how to improve.",
  },
  {
    icon: BarChart3,
    title: "ATS Compatibility Scoring",
    description: "Get a clear score based on how well your resume performs against applicant tracking systems used by top companies.",
  },
  {
    icon: Mic,
    title: "AI Mock Interviews",
    description: "Practice with intelligent interview simulations. Receive readiness scores and actionable feedback after each session.",
  },
  {
    icon: Route,
    title: "Career Roadmaps",
    description: "Personalized step-by-step guidance from where you are to where you want to be. No more guessing your next move.",
  },
];

function FeatureItem({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <div className="flex gap-6 py-12 border-b border-border/50 last:border-0">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-accent/10 transition-colors duration-300">
          <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-accent transition-colors duration-300" />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2 heading-sans">{feature.title}</h3>
          <p className="text-muted-foreground leading-relaxed max-w-xl">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Features() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-16"
        >
          <h2 className="heading-display text-display-lg mb-6">
            One system.
            <br />
            <span className="text-muted-foreground">Complete clarity.</span>
          </h2>
          <p className="body-large">
            Everything works together — resume, interviews, career direction — to give you a complete picture.
          </p>
        </motion.div>

        <div className="max-w-3xl">
          {features.map((feature, index) => (
            <FeatureItem key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}