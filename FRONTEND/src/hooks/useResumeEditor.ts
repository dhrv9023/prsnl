/**
 * useResumeEditor.ts
 *
 * Primary state management hook for the Kareerist Resume Editor workspace.
 * Handles:
 *  - Initial lazy parse fetch via GET /api/v1/resumes/{id}/editor
 *  - In-memory immutable document state (StructuredResume)
 *  - 2-second debounced autosave + explicit manual save via PUT /api/v1/resumes/{id}/editor
 *  - AI bullet rewriting with credit deduction feedback via POST /rewrite_bullet
 *  - One-click AI issue fix application from Deep Analysis
 *  - ATS PDF export and live ReportLab PDF preview compilation
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  apiGetResumeEditor,
  apiSaveResumeEditorDraft,
  apiExportResumePdf,
  apiRewriteBullet,
} from "../lib/api";
import type {
  StructuredResume,
  ResumeBasics,
  ExperienceItem,
  EducationItem,
  SkillCategory,
  ProjectItem,
  CertificationItem,
  EditorMeta,
  AnalysisIssue,
  SectionKey,
} from "../types/resumeEditor";
import { createEmptyResume } from "../types/resumeEditor";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type PreviewMode = "split" | "editor" | "preview";
export type PreviewType = "html" | "pdf";

export function useResumeEditor(resumeId: string | undefined) {
  const [resume, setResume] = useState<StructuredResume | null>(null);
  const [analysisIssues, setAnalysisIssues] = useState<AnalysisIssue[]>([]);
  const [appliedIssueIds, setAppliedIssueIds] = useState<Set<string>>(new Set());
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("split");
  const [previewType, setPreviewType] = useState<PreviewType>("html");

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [rewritingBulletId, setRewritingBulletId] = useState<string | null>(null);

  // References for autosave debounce and dirty tracking
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestResumeRef = useRef<StructuredResume | null>(null);
  latestResumeRef.current = resume;

  // ── 1. Load Editor Data ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!resumeId || resumeId === "new") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await apiGetResumeEditor(resumeId);
      const rawDoc = payload.structured_content || createEmptyResume();
      const fallbackEmpty = createEmptyResume();
      const doc: StructuredResume = {
        basics: { ...fallbackEmpty.basics, ...(rawDoc.basics || {}) },
        experience: Array.isArray(rawDoc.experience) ? rawDoc.experience : [],
        education: Array.isArray(rawDoc.education) ? rawDoc.education : [],
        skills: Array.isArray(rawDoc.skills) ? rawDoc.skills : [],
        projects: Array.isArray(rawDoc.projects) ? rawDoc.projects : [],
        certifications: Array.isArray(rawDoc.certifications) ? rawDoc.certifications : [],
        meta: { ...fallbackEmpty.meta, ...(rawDoc.meta || {}) },
      };
      setResume(doc);
      setAnalysisIssues(payload.analysis_issues || []);
      setFileUrl(payload.file_url || null);
      setIsDirty(false);
      setSaveStatus("saved");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load resume editor";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [resumeId]);

  useEffect(() => {
    loadData();
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // ── 2. Save Document ──────────────────────────────────────────────────────

  const saveDraft = useCallback(
    async (manual = false): Promise<boolean> => {
      if (!resumeId || !latestResumeRef.current) return false;
      setSaveStatus("saving");
      try {
        await apiSaveResumeEditorDraft(resumeId, latestResumeRef.current);
        setSaveStatus("saved");
        setIsDirty(false);
        if (manual) {
          toast.success("Resume saved successfully");
        }
        return true;
      } catch (err: unknown) {
        setSaveStatus("error");
        const msg = err instanceof Error ? err.message : "Failed to save resume draft";
        if (manual) toast.error(msg);
        return false;
      }
    },
    [resumeId]
  );

  // ── 3. Autosave Debounce (2000ms) ──────────────────────────────────────────

  const triggerAutosave = useCallback(() => {
    setIsDirty(true);
    setSaveStatus("idle");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      saveDraft(false);
    }, 2000);
  }, [saveDraft]);

  // ── 4. State Update Handlers ──────────────────────────────────────────────

  const updateBasics = useCallback(
    (patch: Partial<ResumeBasics>) => {
      setResume((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          basics: { ...prev.basics, ...patch },
        };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateExperience = useCallback(
    (items: ExperienceItem[]) => {
      setResume((prev) => {
        if (!prev) return prev;
        return { ...prev, experience: items };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateEducation = useCallback(
    (items: EducationItem[]) => {
      setResume((prev) => {
        if (!prev) return prev;
        return { ...prev, education: items };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateSkills = useCallback(
    (skills: SkillCategory[]) => {
      setResume((prev) => {
        if (!prev) return prev;
        return { ...prev, skills };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateProjects = useCallback(
    (projects: ProjectItem[]) => {
      setResume((prev) => {
        if (!prev) return prev;
        return { ...prev, projects };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateCertifications = useCallback(
    (certifications: CertificationItem[]) => {
      setResume((prev) => {
        if (!prev) return prev;
        return { ...prev, certifications };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  const updateMeta = useCallback(
    (metaPatch: Partial<EditorMeta>) => {
      setResume((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          meta: { ...prev.meta, ...metaPatch },
        };
      });
      triggerAutosave();
    },
    [triggerAutosave]
  );

  // ── 5. AI Bullet Rewriter (3 credits) ──────────────────────────────────────

  const rewriteBullet = useCallback(
    async (
      bulletId: string,
      bulletText: string,
      roleContext: string,
      instruction?: string
    ) => {
      if (!resumeId || !bulletText.trim()) return;
      setRewritingBulletId(bulletId);
      try {
        const res = await apiRewriteBullet(resumeId, {
          bullet_text: bulletText,
          role_context: roleContext,
          instruction,
        });

        // Update in Experience or Projects
        setResume((prev) => {
          if (!prev) return prev;

          const updatedExp = prev.experience.map((exp) => ({
            ...exp,
            bullets: exp.bullets.map((b) =>
              b.id === bulletId ? { ...b, text: res.rewritten_bullet } : b
            ),
          }));

          const updatedProj = prev.projects.map((proj) => ({
            ...proj,
            bullets: proj.bullets.map((b) =>
              b.id === bulletId ? { ...b, text: res.rewritten_bullet } : b
            ),
          }));

          return {
            ...prev,
            experience: updatedExp,
            projects: updatedProj,
          };
        });

        triggerAutosave();
        toast.success("Bullet rewritten with AI (-3 credits)");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to rewrite bullet";
        toast.error(msg);
      } finally {
        setRewritingBulletId(null);
      }
    },
    [resumeId, triggerAutosave]
  );

  // ── 6. Apply AI Fix from Deep Analysis ────────────────────────────────────

  const applyFix = useCallback(
    (issue: AnalysisIssue) => {
      if (!resume) return;

      let applied = false;

      // 1. Direct bullet match
      if (issue.matched_bullet_id) {
        setResume((prev) => {
          if (!prev) return prev;
          const exp = prev.experience.map((e) => ({
            ...e,
            bullets: e.bullets.map((b) =>
              b.id === issue.matched_bullet_id ? { ...b, text: issue.fix } : b
            ),
          }));
          const proj = prev.projects.map((p) => ({
            ...p,
            bullets: p.bullets.map((b) =>
              b.id === issue.matched_bullet_id ? { ...b, text: issue.fix } : b
            ),
          }));
          return { ...prev, experience: exp, projects: proj };
        });
        applied = true;
      } else if (issue.section === "summary") {
        // Apply to summary
        updateBasics({ summary: issue.fix });
        applied = true;
      } else {
        // Fuzzy text match in experience bullets
        const lowerOrig = issue.original.trim().toLowerCase();
        if (lowerOrig) {
          setResume((prev) => {
            if (!prev) return prev;
            let found = false;
            const updatedExp = prev.experience.map((e) => ({
              ...e,
              bullets: e.bullets.map((b) => {
                if (!found && b.text.trim().toLowerCase().includes(lowerOrig)) {
                  found = true;
                  return { ...b, text: issue.fix };
                }
                return b;
              }),
            }));
            if (found) applied = true;
            return found ? { ...prev, experience: updatedExp } : prev;
          });
        }
      }

      if (applied) {
        setAppliedIssueIds((prev) => new Set([...prev, issue.id]));
        triggerAutosave();
        toast.success("AI fix applied to resume");
      } else {
        // Copy fix to clipboard as fallback
        navigator.clipboard.writeText(issue.fix);
        toast.info("Could not auto-locate bullet. Copied AI fix to clipboard!");
      }
    },
    [resume, updateBasics, triggerAutosave]
  );

  // ── 7. Export PDF ─────────────────────────────────────────────────────────

  const exportPdf = useCallback(async () => {
    if (!resumeId) return;
    setIsExporting(true);
    try {
      // Always save pending edits before compiling PDF
      await saveDraft(false);

      const blob = await apiExportResumePdf(resumeId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const candidateName = resume?.basics.name?.replace(/[^a-zA-Z0-9_-]/g, "_") || "kareerist";
      link.download = `${candidateName}_resume.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("ATS Resume PDF downloaded");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to export PDF";
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [resumeId, resume, saveDraft]);

  // ── 8. Refresh ReportLab PDF Preview ──────────────────────────────────────

  const refreshPdfPreview = useCallback(async () => {
    if (!resumeId) return;
    setIsGeneratingPdf(true);
    try {
      await saveDraft(false);
      const blob = await apiExportResumePdf(resumeId);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const newUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(newUrl);
    } catch {
      toast.error("Failed to generate PDF preview");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [resumeId, saveDraft, pdfBlobUrl]);

  return {
    resume,
    analysisIssues,
    appliedIssueIds,
    fileUrl,
    loading,
    error,
    saveStatus,
    isDirty,
    activeSection,
    previewMode,
    previewType,
    pdfBlobUrl,
    isExporting,
    isGeneratingPdf,
    rewritingBulletId,
    setActiveSection,
    setPreviewMode,
    setPreviewType,
    loadData,
    saveDraft,
    updateBasics,
    updateExperience,
    updateEducation,
    updateSkills,
    updateProjects,
    updateCertifications,
    updateMeta,
    rewriteBullet,
    applyFix,
    exportPdf,
    refreshPdfPreview,
  };
}
