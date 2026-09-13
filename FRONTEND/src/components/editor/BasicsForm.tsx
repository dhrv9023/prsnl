import React from "react";
import type { ResumeBasics } from "../../types/resumeEditor";
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe, AlignLeft } from "lucide-react";

interface BasicsFormProps {
  basics: ResumeBasics;
  onChange: (patch: Partial<ResumeBasics>) => void;
  showSummaryOnly?: boolean;
}

export const BasicsForm: React.FC<BasicsFormProps> = ({
  basics,
  onChange,
  showSummaryOnly = false,
}) => {
  if (showSummaryOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Professional Summary</h2>
            <p className="text-xs text-muted-foreground">
              A 2–4 sentence high-impact summary highlighting your core expertise and value proposition.
            </p>
          </div>
        </div>

        <div>
          <textarea
            value={basics.summary || ""}
            onChange={(e) => onChange({ summary: e.target.value })}
            placeholder="e.g. Senior Software Engineer with 6+ years of experience designing and scaling microservices platforms..."
            rows={5}
            className="w-full resize-y rounded-lg border border-border/40 bg-secondary/20 p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>ATS tip: Avoid first-person pronouns (I, my). Focus on competencies and metrics.</span>
            <span>{(basics.summary || "").length} chars</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Contact & Personal Details</h2>
        <p className="text-xs text-muted-foreground">
          Essential header info. Recruiters and ATS bots scan these first.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
          </label>
          <input
            type="text"
            value={basics.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Alex Morgan"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* Professional Title */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            Professional Title / Headline
          </label>
          <input
            type="text"
            value={basics.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Lead Full-Stack Engineer"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
          </label>
          <input
            type="email"
            value={basics.email || ""}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="alex.morgan@example.com"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
          </label>
          <input
            type="tel"
            value={basics.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 (555) 019-2834"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* Location */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Location
          </label>
          <input
            type="text"
            value={basics.location || ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="San Francisco, CA (or Remote / Open to Relocation)"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* LinkedIn */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5 text-muted-foreground" /> LinkedIn Profile
          </label>
          <input
            type="url"
            value={basics.linkedin || ""}
            onChange={(e) => onChange({ linkedin: e.target.value })}
            placeholder="linkedin.com/in/alexmorgan"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* GitHub */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Github className="h-3.5 w-3.5 text-muted-foreground" /> GitHub Profile
          </label>
          <input
            type="url"
            value={basics.github || ""}
            onChange={(e) => onChange({ github: e.target.value })}
            placeholder="github.com/alexmorgan"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {/* Portfolio / Personal Website */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Portfolio / Website
          </label>
          <input
            type="url"
            value={basics.portfolio || ""}
            onChange={(e) => onChange({ portfolio: e.target.value })}
            placeholder="https://alexmorgan.dev"
            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>
      </div>
    </div>
  );
};
