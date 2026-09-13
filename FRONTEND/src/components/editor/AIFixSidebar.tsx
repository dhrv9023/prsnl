import React from "react";
import {
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  CheckCircle2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../ui/button";
import type { AnalysisIssue } from "../../types/resumeEditor";
import { toast } from "sonner";

interface AIFixSidebarProps {
  issues: AnalysisIssue[];
  appliedIssueIds: Set<string>;
  onApplyFix: (issue: AnalysisIssue) => void;
  onClose: () => void;
}

export const AIFixSidebar: React.FC<AIFixSidebarProps> = ({
  issues,
  appliedIssueIds,
  onApplyFix,
  onClose,
}) => {
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Fix copied to clipboard");
  };

  return (
    <aside className="w-80 md:w-96 border-l border-border/40 bg-card/70 backdrop-blur flex flex-col h-full overflow-hidden shrink-0 animate-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-secondary/20">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">AI Deep Analysis Fixes</h3>
            <p className="text-[11px] text-muted-foreground">
              {issues.length} suggested {issues.length === 1 ? "improvement" : "improvements"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition"
          title="Close AI Fixes"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* List of issues */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {issues.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-foreground">No open AI critique items</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Run a Deep Analysis from the Analysis tab to generate section-by-section improvements.
            </p>
          </div>
        ) : (
          issues.map((issue) => {
            const isApplied = appliedIssueIds.has(issue.id);

            return (
              <div
                key={issue.id}
                className={`rounded-xl border p-3.5 space-y-2.5 transition ${
                  isApplied
                    ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                    : "border-border/50 bg-background/60 hover:border-primary/40 shadow-xs"
                }`}
              >
                {/* Section & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="rounded bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {issue.section || "Resume"}
                  </span>
                  {isApplied ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                      <Check className="h-3 w-3" /> Applied
                    </span>
                  ) : issue.matched_bullet_id ? (
                    <span className="text-[10px] text-primary font-medium">
                      Matched to bullet
                    </span>
                  ) : null}
                </div>

                {/* Critique / Why it matters */}
                {issue.critique && (
                  <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                    {issue.critique}
                  </p>
                )}

                {/* Before / Original */}
                {issue.original && (
                  <div className="rounded-lg bg-secondary/30 p-2 text-[11px] text-muted-foreground space-y-0.5">
                    <span className="font-semibold text-[10px] uppercase text-muted-foreground/80 block">
                      Original:
                    </span>
                    <p className="line-clamp-2 italic">"{issue.original}"</p>
                  </div>
                )}

                {/* Recommended Fix */}
                {issue.fix && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-[11px] text-foreground space-y-0.5">
                    <span className="font-semibold text-[10px] uppercase text-primary block flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Recommended Fix:
                    </span>
                    <p className="font-medium text-xs leading-relaxed">{issue.fix}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(issue.fix)}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Copy fix text"
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>

                  <Button
                    variant={isApplied ? "outline" : "default"}
                    size="sm"
                    disabled={isApplied}
                    onClick={() => onApplyFix(issue)}
                    className={`h-7 px-2.5 text-[11px] gap-1 ${
                      isApplied ? "text-emerald-500 border-emerald-500/40" : ""
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check className="h-3 w-3" /> Applied
                      </>
                    ) : (
                      <>
                        <span>Apply Fix</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
