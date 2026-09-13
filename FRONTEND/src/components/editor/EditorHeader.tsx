import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Download,
  Eye,
  Columns,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { Button } from "../ui/button";
import type { TemplateId, FontSize, Margins } from "../../types/resumeEditor";
import type { SaveStatus, PreviewMode } from "../../hooks/useResumeEditor";

interface EditorHeaderProps {
  resumeId: string;
  candidateName: string;
  templateId: TemplateId;
  fontSize: FontSize;
  margins: Margins;
  saveStatus: SaveStatus;
  isDirty: boolean;
  previewMode: PreviewMode;
  isExporting: boolean;
  aiFixesCount: number;
  showAiSidebar: boolean;
  onUpdateMeta: (patch: {
    template_id?: TemplateId;
    font_size?: FontSize;
    margins?: Margins;
  }) => void;
  onSave: () => void;
  onExportPdf: () => void;
  onTogglePreviewMode: (mode: PreviewMode) => void;
  onToggleAiSidebar: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  resumeId,
  candidateName,
  templateId,
  fontSize,
  margins,
  saveStatus,
  isDirty,
  previewMode,
  isExporting,
  aiFixesCount,
  showAiSidebar,
  onUpdateMeta,
  onSave,
  onExportPdf,
  onTogglePreviewMode,
  onToggleAiSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 items-center justify-between px-3 md:px-6">
        {/* Left: Navigation & Document Title */}
        <div className="flex items-center gap-3">
          <Link
            to={`/resumes/${resumeId}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            title="Back to Analysis"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </Link>

          <div className="h-4 w-px bg-border/40" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                {candidateName || "Untitled Resume"}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 text-primary animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </span>
                )}
                {saveStatus === "saved" && !isDirty && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> Autosaved
                  </span>
                )}
                {isDirty && saveStatus !== "saving" && (
                  <span className="flex items-center gap-1 text-amber-500">
                    Unsaved changes
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="h-3 w-3" /> Save failed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Template & Typography Controls */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border/30 bg-secondary/15 p-1 text-xs">
          {/* Template Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onUpdateMeta({ template_id: "classic" })}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                templateId === "classic"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Classic ATS
            </button>
            <button
              type="button"
              onClick={() => onUpdateMeta({ template_id: "modern" })}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                templateId === "modern"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Modern Tech
            </button>
          </div>

          <div className="h-3 w-px bg-border/40" />

          {/* Margins */}
          <select
            value={margins}
            onChange={(e) => onUpdateMeta({ margins: e.target.value as Margins })}
            className="rounded bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground"
            title="Page Margins"
          >
            <option value="compact">Compact Margins</option>
            <option value="normal">Normal Margins</option>
            <option value="spacious">Spacious Margins</option>
          </select>

          <div className="h-3 w-px bg-border/40" />

          {/* Font Size */}
          <select
            value={fontSize}
            onChange={(e) => onUpdateMeta({ font_size: e.target.value as FontSize })}
            className="rounded bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground outline-none hover:text-foreground"
            title="Body Font Size"
          >
            <option value="compact">Compact Font</option>
            <option value="medium">Medium Font</option>
            <option value="large">Large Font</option>
          </select>
        </div>

        {/* Right: View Toggles, AI Fixes, Save & Export */}
        <div className="flex items-center gap-2">
          {/* View Toggles for medium+ screens */}
          <div className="hidden md:flex items-center rounded-lg border border-border/30 bg-secondary/20 p-0.5">
            <button
              type="button"
              onClick={() => onTogglePreviewMode("editor")}
              className={`rounded px-2 py-1 text-xs transition ${
                previewMode === "editor"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Editor Only"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onTogglePreviewMode("split")}
              className={`rounded px-2 py-1 text-xs transition ${
                previewMode === "split"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTogglePreviewMode("preview")}
              className={`rounded px-2 py-1 text-xs transition ${
                previewMode === "preview"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Preview Only"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* AI Fixes Button */}
          {aiFixesCount > 0 && (
            <Button
              variant={showAiSidebar ? "default" : "outline"}
              size="sm"
              onClick={onToggleAiSidebar}
              className="relative gap-1.5 text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">AI Fixes</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-bold text-primary">
                {aiFixesCount}
              </span>
            </Button>
          )}

          {/* Manual Save Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={saveStatus === "saving"}
            className="gap-1.5 text-xs"
            title="Save changes to cloud"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          {/* Download ATS PDF */}
          <Button
            variant="default"
            size="sm"
            onClick={onExportPdf}
            disabled={isExporting}
            className="gap-1.5 text-xs shadow-sm"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Export PDF</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
