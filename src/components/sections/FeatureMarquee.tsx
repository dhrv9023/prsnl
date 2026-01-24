import { motion } from "framer-motion";
import { FileText, Target, MessageSquare, TrendingUp, Map, Sparkles } from "lucide-react";

const features = [
  { icon: FileText, label: "Resume Analysis" },
  { icon: Target, label: "ATS Scoring" },
  { icon: MessageSquare, label: "AI Mock Interviews" },
  { icon: TrendingUp, label: "Career Roadmaps" },
  { icon: Map, label: "Skill Mapping" },
  { icon: Sparkles, label: "Personalized Insights" },
];

export function FeatureMarquee() {
  return (
    <section className="py-16 border-y border-border/50 overflow-hidden">
      <div className="relative">
        <div className="flex gap-8 marquee">
          {[...features, ...features].map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-6 py-3 bg-secondary/50 rounded-full whitespace-nowrap"
            >
              <feature.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}