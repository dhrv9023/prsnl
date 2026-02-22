import { motion } from "framer-motion";
import { FileText, Target, MessageSquare, TrendingUp, Map, Sparkles } from "lucide-react";

const features = [
  { icon: FileText, label: "Resume Analysis" },
  { icon: Target, label: "ATS Scoring" },
  { icon: MessageSquare, label: "AI Mock Interviews" },
  { icon: TrendingUp, label: "Career Roadmaps" },
  { icon: Sparkles, label: "AI Mock Interviews" },
  { icon: Sparkles, label: "Resume Template Generator"},
  { icon: Sparkles, label: "Job Description Analyzer"},
  { icon: Sparkles, label: "Cover Letter Generator"},
  { icon: Sparkles, label: "AI Project Recommender" },
  { icon: Sparkles, label: "Role Fit Score" },
  { icon: Sparkles, label: "Job Tracker" },
  { icon: Sparkles, label: "Resume Audit Marketplace" },
  { icon: Sparkles, label: "Career Twin" },
  { icon: Sparkles, label: "24x7 AI Chatbot" },
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