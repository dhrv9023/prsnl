import React from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  AlignLeft,
} from "lucide-react";
import type { SectionKey, StructuredResume } from "../../types/resumeEditor";

interface SectionNavProps {
  activeSection: SectionKey | "summary";
  resume: StructuredResume;
  onSelectSection: (section: SectionKey | "summary") => void;
}

interface SectionTab {
  key: SectionKey | "summary";
  label: string;
  icon: React.ElementType;
  getCount?: (r: StructuredResume) => number | null;
}

const TABS: SectionTab[] = [
  {
    key: "basics" as any,
    label: "Contact",
    icon: User,
  },
  {
    key: "summary",
    label: "Summary",
    icon: AlignLeft,
  },
  {
    key: "experience",
    label: "Experience",
    icon: Briefcase,
    getCount: (r) => r.experience?.length || 0,
  },
  {
    key: "education",
    label: "Education",
    icon: GraduationCap,
    getCount: (r) => r.education?.length || 0,
  },
  {
    key: "skills",
    label: "Skills",
    icon: Wrench,
    getCount: (r) => r.skills?.length || 0,
  },
  {
    key: "projects",
    label: "Projects",
    icon: FolderGit2,
    getCount: (r) => r.projects?.length || 0,
  },
  {
    key: "certifications",
    label: "Certs",
    icon: Award,
    getCount: (r) => r.certifications?.length || 0,
  },
];

export const SectionNav: React.FC<SectionNavProps> = ({
  activeSection,
  resume,
  onSelectSection,
}) => {
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto p-2 border-b md:border-b-0 md:border-r border-border/40 bg-card/40 md:w-48 shrink-0 no-scrollbar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSection === tab.key;
        const count = tab.getCount ? tab.getCount(resume) : null;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectSection(tab.key)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition whitespace-nowrap text-left ${
              isActive
                ? "bg-primary/15 text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </div>
            {count !== null && count > 0 && (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.2 text-[10px] ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
