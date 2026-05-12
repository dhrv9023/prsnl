import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Check, Clock } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Get started with essential career tools",
    features: [
      "100 free credits on signup",
      "ATS Match Score",
      "Deep Resume Analysis",
      "Cover Letter Generator",
      "AI Mock Interview",
    ],
    featured: false,
  },
  {
    name: "Pro",
    price: "₹99",
    period: "/mo",
    description: "For serious job seekers",
    features: [
      "300 credits / month",
      "Everything in Starter",
      "Hiring Intelligence Reports",
      "Priority AI processing",
      "Interview history & tracking",
    ],
    featured: true,
  },
  {
    name: "Power",
    price: "₹249",
    period: "/mo",
    description: "For active job hunters",
    features: [
      "1000 credits / month",
      "Everything in Pro",
      "Bulk resume analysis",
      "Dedicated support",
      "Early access to new features",
    ],
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
            Start free with 100 credits. Top-up plans coming soon.
          </p>

          {/* Coming soon banner */}
          <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full border border-amber-500/25 bg-amber-500/8 text-amber-400 text-sm font-medium">
            <Clock className="w-4 h-4" />
            Paid plans launching soon — all features free during beta
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-2xl p-6 md:p-8 opacity-70 ${
                plan.featured
                  ? "bg-primary/20 border border-primary/30"
                  : "bg-background border border-border/50"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-secondary border border-border/50 text-muted-foreground rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-foreground/70">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-foreground/60">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground/50">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm mt-2 text-muted-foreground/50">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground/50">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground/30" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Greyed-out disabled button */}
              <div className="w-full h-12 rounded-full flex items-center justify-center gap-2 border border-border/30 bg-secondary/30 text-muted-foreground/40 text-sm font-medium cursor-not-allowed select-none">
                <Clock className="w-4 h-4" />
                Coming Soon
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-xs text-muted-foreground/30 mt-8"
        >
          Credits never expire · Secure payments via Razorpay · GST included
        </motion.p>
      </div>
    </section>
  );
}
