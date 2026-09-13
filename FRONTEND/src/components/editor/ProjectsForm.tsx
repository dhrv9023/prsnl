import React, { useState } from "react";
import { FolderGit2, Plus, Trash2, ChevronDown, ChevronUp, Link as LinkIcon, X } from "lucide-react";
import { Button } from "../ui/button";
import type { ProjectItem } from "../../types/resumeEditor";
import { createBullet, newId } from "../../types/resumeEditor";

interface ProjectsFormProps {
  projects: ProjectItem[];
  onChange: (projects: ProjectItem[]) => void;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  projects,
  onChange,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  );
  const [techInputs, setTechInputs] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const newProj: ProjectItem = {
      id: newId(),
      name: "",
      description: "",
      link: "",
      technologies: [],
      bullets: [createBullet()],
    };
    onChange([newProj, ...projects]);
    setExpandedIds((prev) => new Set([...prev, newProj.id]));
  };

  const handleRemove = (index: number) => {
    onChange(projects.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<ProjectItem>) => {
    onChange(
      projects.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  };

  const handleAddBullet = (projIndex: number) => {
    const proj = projects[projIndex];
    const newBullets = [...(proj.bullets || []), createBullet()];
    handleUpdate(projIndex, { bullets: newBullets });
  };

  const handleUpdateBullet = (
    projIndex: number,
    bulletIndex: number,
    text: string
  ) => {
    const proj = projects[projIndex];
    const newBullets = proj.bullets.map((b, bi) =>
      bi === bulletIndex ? { ...b, text } : b
    );
    handleUpdate(projIndex, { bullets: newBullets });
  };

  const handleRemoveBullet = (projIndex: number, bulletIndex: number) => {
    const proj = projects[projIndex];
    const newBullets = proj.bullets.filter((_, bi) => bi !== bulletIndex);
    handleUpdate(projIndex, { bullets: newBullets });
  };

  const handleAddTech = (projIndex: number, rawInput: string) => {
    if (!rawInput.trim()) return;
    const proj = projects[projIndex];
    const tokens = rawInput
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const existing = new Set(proj.technologies.map((t) => t.toLowerCase()));
    const uniqueNew = tokens.filter((t) => !existing.has(t.toLowerCase()));

    if (uniqueNew.length > 0) {
      handleUpdate(projIndex, {
        technologies: [...proj.technologies, ...uniqueNew],
      });
    }
    setTechInputs((prev) => ({ ...prev, [proj.id]: "" }));
  };

  const handleRemoveTech = (projIndex: number, techIdx: number) => {
    const proj = projects[projIndex];
    const updated = proj.technologies.filter((_, i) => i !== techIdx);
    handleUpdate(projIndex, { technologies: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Projects & Open Source</h2>
          <p className="text-xs text-muted-foreground">
            Showcase personal, academic, or open-source software projects and technical achievements.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/30">
          <FolderGit2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No projects added</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add significant software builds or open-source contributions.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAdd}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Project
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, projIdx) => {
            const isExpanded = expandedIds.has(proj.id);
            const techInputVal = techInputs[proj.id] || "";

            return (
              <div
                key={proj.id}
                className="rounded-xl border border-border/40 bg-card/50 overflow-hidden transition"
              >
                {/* Header Bar */}
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 bg-secondary/15 cursor-pointer hover:bg-secondary/25 transition select-none"
                  onClick={() => toggleExpand(proj.id)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderGit2 className="h-4 w-4 text-primary shrink-0" />
                    <div className="truncate text-xs font-semibold text-foreground">
                      {proj.name || "Untitled Project"}{" "}
                      <span className="font-normal text-muted-foreground">
                        {proj.technologies?.length > 0
                          ? `(${proj.technologies.slice(0, 3).join(", ")})`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(projIdx);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                      title="Delete project"
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
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={proj.name || ""}
                          onChange={(e) =>
                            handleUpdate(projIdx, { name: e.target.value })
                          }
                          placeholder="e.g. OpenTrace or Distributed File System"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>

                      {/* Project Link */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                          <LinkIcon className="h-3 w-3 text-muted-foreground" /> Project / Repository URL
                        </label>
                        <input
                          type="url"
                          value={proj.link || ""}
                          onChange={(e) =>
                            handleUpdate(projIdx, { link: e.target.value })
                          }
                          placeholder="https://github.com/username/project"
                          className="w-full rounded-lg border border-border/40 bg-secondary/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition"
                        />
                      </div>
                    </div>

                    {/* Technologies Tag Chips */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground">
                        Technologies Used
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border/30 bg-secondary/15">
                        {proj.technologies?.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            <span>{tech}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTech(projIdx, tIdx)}
                              className="text-muted-foreground hover:text-destructive transition"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          value={techInputVal}
                          onChange={(e) =>
                            setTechInputs((prev) => ({
                              ...prev,
                              [proj.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              handleAddTech(projIdx, techInputVal);
                            }
                          }}
                          onBlur={() => {
                            if (techInputVal.trim()) {
                              handleAddTech(projIdx, techInputVal);
                            }
                          }}
                          placeholder="+ Add tech (press Enter)..."
                          className="flex-1 min-w-[100px] bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none py-0.5"
                        />
                      </div>
                    </div>

                    {/* Bullets */}
                    <div className="space-y-2 pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">
                          Project Bullets & Accomplishments
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddBullet(projIdx)}
                          className="h-6 gap-1 px-2 text-[11px] text-primary"
                        >
                          <Plus className="h-3 w-3" /> Add Bullet
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {proj.bullets?.map((bullet, bulletIdx) => (
                          <div
                            key={bullet.id}
                            className="flex items-start gap-2 rounded-lg border border-border/30 bg-background/50 p-2"
                          >
                            <span className="mt-1 text-xs text-muted-foreground font-bold select-none">
                              &bull;
                            </span>
                            <textarea
                              value={bullet.text || ""}
                              onChange={(e) =>
                                handleUpdateBullet(projIdx, bulletIdx, e.target.value)
                              }
                              placeholder="e.g. Implemented RAFT consensus algorithm in Go, tested across a 5-node cluster..."
                              rows={2}
                              className="w-full resize-none bg-transparent text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBullet(projIdx, bulletIdx)}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition shrink-0 mt-0.5"
                              title="Delete bullet"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
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
