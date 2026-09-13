import React, { useState } from "react";
import { GraduationCap, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import type { EducationItem } from "../../types/resumeEditor";
import { createBullet, newId } from "../../types/resumeEditor";

interface EducationFormProps {
  education: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export const EducationForm: React.FC<EducationFormProps> = ({
  education,
  onChange,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(education.map((e) => e.id))
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const newItem: EducationItem = {
      id: newId(),
      institution: "",
      degree: "",
      field_of_study: "",
      location: "",
      start_date: "",
      end_date: "",
      gpa: "",
      bullets: [],
    };
    onChange([newItem, ...education]);
    setExpandedIds((prev) => new Set([...prev, newItem.id]));
  };

  const handleRemove = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<EducationItem>) => {
    onChange(
      education.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Education & Degrees</h2>
          <p className="text-xs text-muted-foreground">
            Degrees, academic background, universities, and major coursework.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Degree
        </Button>
      </div>

      {education.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/30">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No education entries yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add university degrees, colleges, or diplomas.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Education
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {education.map((item, index) => {
            const isExpanded = expandedIds.has(item.id);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/40 bg-card/50 overflow-hidden transition"
              >
                {/* Header Bar */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/15 cursor-pointer hover:bg-secondary/25 transition select-none"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate text-xs font-semibold text-foreground">
                      {item.degree || "Degree"}{" "}
                      {item.field_of_study ? `in ${item.field_of_study}` : ""}{" "}
                      <span className="font-normal text-muted-foreground">
                        {item.institution ? `— ${item.institution}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                      title="Delete education"
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

                {/* Body */}
                {isExpanded && (
                  <div className="p-3.5 space-y-3 border-t border-border/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Institution */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          School / Institution
                        </label>
                        <input
                          type="text"
                          value={item.institution || ""}
                          onChange={(e) =>
                            handleUpdate(index, { institution: e.target.value })
                          }
                          placeholder="e.g. University of California, Berkeley"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Degree */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Degree Type
                        </label>
                        <input
                          type="text"
                          value={item.degree || ""}
                          onChange={(e) =>
                            handleUpdate(index, { degree: e.target.value })
                          }
                          placeholder="e.g. B.S., M.S., B.Tech, Ph.D."
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Field of Study */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Field of Study / Major
                        </label>
                        <input
                          type="text"
                          value={item.field_of_study || ""}
                          onChange={(e) =>
                            handleUpdate(index, { field_of_study: e.target.value })
                          }
                          placeholder="e.g. Computer Science & Engineering"
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
                            handleUpdate(index, { location: e.target.value })
                          }
                          placeholder="e.g. Berkeley, CA"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Dates */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Years (Start – End)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.start_date || ""}
                            onChange={(e) =>
                              handleUpdate(index, { start_date: e.target.value })
                            }
                            placeholder="e.g. 2018"
                            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                          />
                          <input
                            type="text"
                            value={item.end_date || ""}
                            onChange={(e) =>
                              handleUpdate(index, { end_date: e.target.value })
                            }
                            placeholder="e.g. 2022"
                            className="w-full rounded-lg border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                          />
                        </div>
                      </div>

                      {/* GPA */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          GPA / Honours (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.gpa || ""}
                          onChange={(e) =>
                            handleUpdate(index, { gpa: e.target.value })
                          }
                          placeholder="e.g. 3.9/4.0 or Magna Cum Laude"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
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
