import React, { useState } from "react";
import { Wrench, Plus, Trash2, X } from "lucide-react";
import { Button } from "../ui/button";
import type { SkillCategory } from "../../types/resumeEditor";
import { newId } from "../../types/resumeEditor";

interface SkillsFormProps {
  skills: SkillCategory[];
  onChange: (skills: SkillCategory[]) => void;
}

export const SkillsForm: React.FC<SkillsFormProps> = ({ skills, onChange }) => {
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

  const handleAddCategory = () => {
    const newCat: SkillCategory = {
      id: newId(),
      category: "Technical Skills",
      items: [],
    };
    onChange([...skills, newCat]);
  };

  const handleRemoveCategory = (index: number) => {
    onChange(skills.filter((_, i) => i !== index));
  };

  const handleUpdateCategoryTitle = (index: number, category: string) => {
    onChange(
      skills.map((cat, i) => (i === index ? { ...cat, category } : cat))
    );
  };

  const handleAddSkillTag = (catIndex: number, rawInput: string) => {
    if (!rawInput.trim()) return;
    const cat = skills[catIndex];

    // Split on comma or semicolon to support pasting lists
    const tokens = rawInput
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const existingSet = new Set(cat.items.map((i) => i.toLowerCase()));
    const uniqueNew = tokens.filter((t) => !existingSet.has(t.toLowerCase()));

    if (uniqueNew.length > 0) {
      const updatedItems = [...cat.items, ...uniqueNew];
      onChange(
        skills.map((c, i) => (i === catIndex ? { ...c, items: updatedItems } : c))
      );
    }

    setNewTagInputs((prev) => ({ ...prev, [cat.id]: "" }));
  };

  const handleRemoveSkillTag = (catIndex: number, tagIndex: number) => {
    const cat = skills[catIndex];
    const updatedItems = cat.items.filter((_, i) => i !== tagIndex);
    onChange(
      skills.map((c, i) => (i === catIndex ? { ...c, items: updatedItems } : c))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Skills & Competencies</h2>
          <p className="text-xs text-muted-foreground">
            Group skills by category (e.g. Languages, Frameworks, Cloud, Tools) for ATS clarity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCategory}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Add Category
        </Button>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center bg-card/30">
          <Wrench className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-xs font-medium text-foreground">No skill categories added</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Add categories like Languages, Frameworks, or Databases.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddCategory}
            className="mt-3 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add Skills Category
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {skills.map((cat, catIdx) => {
            const inputVal = newTagInputs[cat.id] || "";

            return (
              <div
                key={cat.id}
                className="rounded-xl border border-border/40 bg-card/50 p-3.5 space-y-3"
              >
                {/* Category Header Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <Wrench className="h-3.5 w-3.5 text-primary shrink-0" />
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) =>
                        handleUpdateCategoryTitle(catIdx, e.target.value)
                      }
                      placeholder="e.g. Languages / Cloud / Databases"
                      className="w-full bg-transparent text-xs font-semibold text-foreground border-b border-dashed border-border/60 pb-0.5 outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(catIdx)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition"
                    title="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Skill Pills */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] p-2 rounded-lg border border-border/30 bg-secondary/15">
                  {cat.items.map((item, itemIdx) => (
                    <span
                      key={`${cat.id}-${itemIdx}`}
                      className="inline-flex items-center gap-1 rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-medium text-foreground group"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillTag(catIdx, itemIdx)}
                        className="text-muted-foreground hover:text-destructive transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}

                  {/* Add skill input chip */}
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) =>
                      setNewTagInputs((prev) => ({
                        ...prev,
                        [cat.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddSkillTag(catIdx, inputVal);
                      }
                    }}
                    onBlur={() => {
                      if (inputVal.trim()) {
                        handleAddSkillTag(catIdx, inputVal);
                      }
                    }}
                    placeholder={
                      cat.items.length === 0
                        ? "Type a skill & press Enter (or paste comma-separated list)..."
                        : "+ Add skill..."
                    }
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none py-0.5"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Press Enter or comma to create a pill. Paste comma-separated lists to bulk add.</span>
                  <span>{cat.items.length} skills</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
