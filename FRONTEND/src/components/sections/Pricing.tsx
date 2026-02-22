import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Get started with essential career tools",
    features: [
      "Basic resume analysis",
      "1 AI mock interview",
      "Career path suggestions",
      "Community access",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "Everything you need to land your dream job",
    features: [
      "Advanced resume analysis & ATS scoring",
      "Unlimited AI mock interviews",
      "Personalized career roadmap",
      "Line-by-line feedback",
      "Interview readiness scoring",
      "Priority support",
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For career services and organizations",
    features: [
      "Everything in Pro",
      "Up to 50 team members",
      "Admin dashboard & analytics",
      "Custom integrations",
      "Dedicated success manager",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-24 md:py-32 bg-secondary/30">
      <div className="container">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2 className="heading-display text-display-lg mb-6">
            Simple, transparent pricing
          </h2>
          <p className="body-large max-w-xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-2xl p-6 md:p-8 ${
                plan.featured
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full">
                  Most Popular
                </span>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{plan.price}</span>
                  {plan.period && (
                    <span className={plan.featured ? "text-primary-foreground/70" : "text-muted-foreground"}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm mt-2 ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.featured ? "text-accent" : "text-accent-teal"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`btn-premium w-full h-12 rounded-full text-sm font-medium ${
                  plan.featured
                    ? "bg-background text-foreground hover:bg-background/90"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}