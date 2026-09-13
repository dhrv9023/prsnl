import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileText,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useResumeEditor } from "../hooks/useResumeEditor";
import { EditorHeader } from "../components/editor/EditorHeader";
import { SectionNav } from "../components/editor/SectionNav";
import { BasicsForm } from "../components/editor/BasicsForm";
import { ExperienceForm } from "../components/editor/ExperienceForm";
import { EducationForm } from "../components/editor/EducationForm";
import { SkillsForm } from "../components/editor/SkillsForm";
import { ProjectsForm } from "../components/editor/ProjectsForm";
import { CertificationsForm } from "../components/editor/CertificationsForm";
import { ResumePreviewSheet } from "../components/editor/ResumePreviewSheet";
import { AIFixSidebar } from "../components/editor/AIFixSidebar";
import type { SectionKey } from "../types/resumeEditor";

const ResumeEditor: React.FC = () => {
  const { id: resumeId } = useParams<{ id: string }>();
  const [showAiSidebar, setShowAiSidebar] = useState<boolean>(false);

  const {
    resume,
    analysisIssues,
    appliedIssueIds,
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
  } = useResumeEditor(resumeId);

  // ── 1. Loading State ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <FileText className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-base font-semibold text-foreground">
              Opening Resume in Editor...
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm">
              Parsing sections, validating ATS structure, and syncing your Deep Analysis fixes.
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── 2. Error State ─────────────────────────────────────────────────────────

  if (error || !resume || !resumeId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background px-4">
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center max-w-md shadow-xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Unable to Open Resume Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {error || "Resume not found or access denied."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link to="/resume-analysis">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Resumes
              </Button>
            </Link>
            <Button
              variant="default"
              size="sm"
              onClick={loadData}
              className="text-xs"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. Active Section Form Router ──────────────────────────────────────────

  const renderActiveSectionForm = () => {
    switch (activeSection) {
      case "basics":
        return <BasicsForm basics={resume.basics} onChange={updateBasics} />;
      case "summary":
        return (
          <BasicsForm
            basics={resume.basics}
            onChange={updateBasics}
            showSummaryOnly
          />
        );
      case "experience":
        return (
          <ExperienceForm
            experience={resume.experience}
            onChange={updateExperience}
            onRewriteBullet={rewriteBullet}
            rewritingBulletId={rewritingBulletId}
          />
        );
      case "education":
        return (
          <EducationForm
            education={resume.education}
            onChange={updateEducation}
          />
        );
      case "skills":
        return <SkillsForm skills={resume.skills} onChange={updateSkills} />;
      case "projects":
        return (
          <ProjectsForm projects={resume.projects} onChange={updateProjects} />
        );
      case "certifications":
        return (
          <CertificationsForm
            certifications={resume.certifications}
            onChange={updateCertifications}
          />
        );
      default:
        return <BasicsForm basics={resume.basics} onChange={updateBasics} />;
    }
  };

  const showEditorPane = previewMode === "split" || previewMode === "editor";
  const showPreviewPane = previewMode === "split" || previewMode === "preview";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Sticky Editor Header */}
      <EditorHeader
        resumeId={resumeId}
        candidateName={resume.basics.name}
        templateId={resume.meta?.template_id || "classic"}
        fontSize={resume.meta?.font_size || "medium"}
        margins={resume.meta?.margins || "normal"}
        saveStatus={saveStatus}
        isDirty={isDirty}
        previewMode={previewMode}
        isExporting={isExporting}
        aiFixesCount={analysisIssues.length}
        showAiSidebar={showAiSidebar}
        onUpdateMeta={updateMeta}
        onSave={() => saveDraft(true)}
        onExportPdf={exportPdf}
        onTogglePreviewMode={setPreviewMode}
        onToggleAiSidebar={() => setShowAiSidebar((prev) => !prev)}
      />

      {/* Main Workspace Multi-Panel Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Side: Section Navigator + Active Form Container */}
        {showEditorPane && (
          <div
            className={`flex flex-col md:flex-row h-full overflow-hidden ${
              previewMode === "split" ? "w-full md:w-1/2 lg:w-[52%]" : "w-full"
            }`}
          >
            {/* Section Tabs Navigator */}
            <SectionNav
              activeSection={activeSection}
              resume={resume}
              onSelectSection={(sec) => setActiveSection(sec as SectionKey)}
            />

            {/* Form Scroll Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
              <div className="max-w-2xl mx-auto">{renderActiveSectionForm()}</div>
            </main>
          </div>
        )}

        {/* Right Side: Dual-mode Live Preview Sheet */}
        {showPreviewPane && (
          <div
            className={`h-full overflow-hidden ${
              previewMode === "split" ? "hidden md:flex flex-1" : "w-full flex"
            }`}
          >
            <ResumePreviewSheet
              resume={resume}
              previewType={previewType}
              pdfBlobUrl={pdfBlobUrl}
              isGeneratingPdf={isGeneratingPdf}
              onRefreshPdf={refreshPdfPreview}
              onExportPdf={exportPdf}
              onChangePreviewType={setPreviewType}
            />
          </div>
        )}

        {/* AI Fixes Sidebar Drawer */}
        {showAiSidebar && (
          <AIFixSidebar
            issues={analysisIssues}
            appliedIssueIds={appliedIssueIds}
            onApplyFix={applyFix}
            onClose={() => setShowAiSidebar(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ResumeEditor;
