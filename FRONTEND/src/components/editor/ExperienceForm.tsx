import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/button";
import type { ExperienceItem, ResumeBullet } from "../../types/resumeEditor";
import { createBullet, newId } from "../../types/resumeEditor";

interface ExperienceFormProps {
  experience: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
  onRewriteBullet: (
    bulletId: string,
    bulletText: string,
    roleContext: string,
    instruction?: string
  ) => Promise<void>;
  rewritingBulletId: string | null;
}

export const ExperienceForm: React.FC<ExperienceFormProps> = ({
  experience,
  onChange,
  onRewriteBullet,
  rewritingBulletId,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(experience.map((e) => e.id))
  );
  const [activeRewriteId, setActiveRewriteId] = useState<string | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState<string>("");

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddPosition = () => {
    const newItem: ExperienceItem = {
      id: newId(),
      company: "",
      role: "",
      location: "",
      start_date: "",
      end_date: "",
      current: false,
      bullets: [createBullet()],
    };
    onChange([newItem, ...experience]);
    setExpandedIds((prev) => new Set([...prev, newItem.id]));
  };

  const handleRemovePosition = (index: number) => {
    const updated = experience.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdatePosition = (index: number, patch: Partial<ExperienceItem>) => {
    const updated = experience.map((item, i) =>
      i === index ? { ...item, ...patch } : item
    );
    onChange(updated);
  };

  const handleAddBullet = (expIndex: number) => {
    const item = experience[expIndex];
    const newBullets = [...(item.bullets || []), createBullet()];
    handleUpdatePosition(expIndex, { bullets: newBullets });
  };

  const handleUpdateBullet = (
    expIndex: number,
    bulletIndex: number,
    text: string
  ) => {
    const item = experience[expIndex];
    const newBullets = item.bullets.map((b, bi) =>
      bi === bulletIndex ? { ...b, text } : b
    );
    handleUpdatePosition(expIndex, { bullets: newBullets });
  };

  const handleRemoveBullet = (expIndex: number, bulletIndex: number) => {
    const item = experience[expIndex];
    const newBullets = item.bullets.filter((_, bi) => bi !== bulletIndex);
    handleUpdatePosition(expIndex, { bullets: newBullets });
  };

  const handleTriggerRewrite = async (
    bulletId: string,
    bulletText: string,
    roleContext: string
  ) => {
    await onRewriteBullet(bulletId, bulletText, roleContext, rewriteInstruction);
    setActiveRewriteId(null);
    setRewriteInstruction("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Work Experience</h2>
          <p className="text-xs text-muted-foreground">
            List your relevant career history in reverse chronological order.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddPosition}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Position
        </Button>
      </div>

      {experience.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/30">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No experience entries yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add your work experience to highlight your achievements and impact.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddPosition}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add First Position
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {experience.map((item, index) => {
            const isExpanded = expandedIds.has(item.id);
            const roleContext = `${item.role || "Role"} at ${item.company || "Company"}`;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/40 bg-card/50 overflow-hidden transition"
              >
                {/* Header / Summary Bar */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/15 cursor-pointer hover:bg-secondary/25 transition select-none"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Briefcase className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate text-xs font-semibold text-foreground">
                      {item.role || "Untitled Role"}{" "}
                      <span className="font-normal text-muted-foreground">
                        {item.company ? `@ ${item.company}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemovePosition(index);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                      title="Delete position"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:text-foreground transition"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Form Fields Body */}
                {isExpanded && (
                  <div className="p-3.5 space-y-3 border-t border-border/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Job Title */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Job Title / Role
                        </label>
                        <input
                          type="text"
                          value={item.role || ""}
                          onChange={(e) =>
                            handleUpdatePosition(index, { role: e.target.value })
                          }
                          placeholder="e.g. Senior Software Engineer"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Company Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Company / Organization
                        </label>
                        <input
                          type="text"
                          value={item.company || ""}
                          onChange={(e) =>
                            handleUpdatePosition(index, { company: e.target.value })
                          }
                          placeholder="e.g. Acme Corp"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Location */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Location
                        </label>
                        <input
                          type="text"
                          value={item.location || ""}
                          onChange={(e) =>
                            handleUpdatePosition(index, { location: e.target.value })
                          }
                          placeholder="e.g. San Francisco, CA (or Remote)"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Dates & Current Status */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-medium text-foreground">
                            Date Range
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.current || false}
                              onChange={(e) =>
                                handleUpdatePosition(index, {
                                  current: e.target.checked,
                                  end_date: e.target.checked ? "Present" : "",
                                })
                              }
                              className="rounded border-border/40 text-primary accent-primary text-xs"
                            />
                            Present
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.start_date || ""}
                            onChange={(e) =>
                              handleUpdatePosition(index, { start_date: e.target.value })
                            }
                            placeholder="e.g. Jan 2021"
                            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                          />
                          <input
                            type="text"
                            value={item.current ? "Present" : item.end_date || ""}
                            disabled={item.current}
                            onChange={(e) =>
                              handleUpdatePosition(index, { end_date: e.target.value })
                            }
                            placeholder="e.g. Present"
                            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition disabled:opacity-60"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bullet Points Section */}
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <span>Key Achievements & Bullets</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            ({item.bullets?.length || 0})
                          </span>
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddBullet(index)}
                          className="h-6 gap-1 px-2 text-[11px] text-primary"
                        >
                          <Plus className="h-3 w-3" /> Add Bullet
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {item.bullets?.map((bullet, bulletIdx) => {
                          const isRewriting = rewritingBulletId === bullet.id;
                          const showRewriteBox = activeRewriteId === bullet.id;

                          return (
                            <div
                              key={bullet.id}
                              className="group relative rounded-lg border border-border/30 bg-background/50 p-2 space-y-1.5"
                            >
                              <div className="flex items-start gap-2">
                                <span className="mt-1 text-xs text-muted-foreground font-bold select-none">
                                  &bull;
                                </span>
                                <textarea
                                  value={bullet.text || ""}
                                  onChange={(e) =>
                                    handleUpdateBullet(index, bulletIdx, e.target.value)
                                  }
                                  placeholder="e.g. Architected Kafka stream pipeline reducing P95 latency by 40% across 5M daily events..."
                                  rows={2}
                                  className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none"
                                />
                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                  {/* AI Rewrite Trigger */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveRewriteId(
                                        showRewriteBox ? null : bullet.id
                                      )
                                    }
                                    className={`rounded p-1 transition ${
                                      showRewriteBox
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    }`}
                                    title="Rewrite with AI (3 credits)"
                                    disabled={!bullet.text.trim() || isRewriting}
                                  >
                                    {isRewriting ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    )}
                                  </button>

                                  {/* Delete Bullet */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBullet(index, bulletIdx)}
                                    className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                                    title="Delete bullet"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Inline AI Rewrite Box */}
                              {showRewriteBox && (
                                <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-2 mt-1 animate-in fade-in-50 duration-150">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-primary flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" /> AI Bullet Coach
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Costs 3 credits
                                    </span>
                                  </div>

                                  <input
                                    type="text"
                                    value={rewriteInstruction}
                                    onChange={(e) => setRewriteInstruction(e.target.value)}
                                    placeholder="Optional instruction: e.g. 'Add metrics', 'Focus on leadership', 'Make more concise'..."
                                    className="w-full rounded border border-border/40 bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
                                  />

                                  <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1">
                                      {["Add metrics", "Make punchy", "Action verb led"].map(
                                        (preset) => (
                                          <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setRewriteInstruction(preset)}
                                            className="rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition"
                                          >
                                            {preset}
                                          </button>
                                        )
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActiveRewriteId(null)}
                                        className="h-6 text-[10px] px-2"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() =>
                                          handleTriggerRewrite(
                                            bullet.id,
                                            bullet.text,
                                            roleContext
                                          )
                                        }
                                        disabled={isRewriting}
                                        className="h-6 text-[10px] px-2.5 gap-1"
                                      >
                                        {isRewriting ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Sparkles className="h-3 w-3" />
                                        )}
                                        <span>Rewrite</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
