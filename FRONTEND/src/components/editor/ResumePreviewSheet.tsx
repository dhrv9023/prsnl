import React, { useState } from "react";
import {
  FileText,
  RefreshCw,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "../ui/button";
import type { StructuredResume, SectionKey } from "../../types/resumeEditor";
import type { PreviewType } from "../../hooks/useResumeEditor";

interface ResumePreviewSheetProps {
  resume: StructuredResume;
  previewType: PreviewType;
  pdfBlobUrl: string | null;
  isGeneratingPdf: boolean;
  onRefreshPdf: () => void;
  onExportPdf: () => void;
  onChangePreviewType: (type: PreviewType) => void;
}

export const ResumePreviewSheet: React.FC<ResumePreviewSheetProps> = ({
  resume,
  previewType,
  pdfBlobUrl,
  isGeneratingPdf,
  onRefreshPdf,
  onExportPdf,
  onChangePreviewType,
}) => {
  const [zoom, setZoom] = useState<number>(100);

  const { basics, experience, education, skills, projects, certifications, meta } = resume;
  const templateId = meta?.template_id || "classic";
  const sectionOrder = meta?.section_order || [
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
  ];

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 130));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 70));
  const handleResetZoom = () => setZoom(100);

  // ── Margin & Font Size Classes ────────────────────────────────────────────

  const marginClass =
    meta?.margins === "compact"
      ? "p-6 sm:p-8"
      : meta?.margins === "spacious"
      ? "p-10 sm:p-14"
      : "p-8 sm:p-10";

  const fontSizeClass =
    meta?.font_size === "compact"
      ? "text-[11px] leading-[1.35]"
      : meta?.font_size === "large"
      ? "text-[13px] leading-[1.5]"
      : "text-[12px] leading-[1.4]";

  const isModern = templateId === "modern";
  const isMinimal = templateId === "minimal";
  const isTechnical = templateId === "technical";

  let accentColor = "text-slate-900";
  let dividerColor = "border-slate-300";
  let headerClass = "uppercase text-[12px] font-bold tracking-wider";

  if (isModern) {
    accentColor = "text-blue-600";
    dividerColor = "border-blue-600";
    headerClass = "capitalize text-[12px] font-bold tracking-wider";
  } else if (isMinimal) {
    accentColor = "text-slate-700";
    dividerColor = "border-slate-200";
    headerClass = "uppercase text-[11px] font-semibold tracking-[0.2em] text-slate-700";
  } else if (isTechnical) {
    accentColor = "text-teal-700";
    dividerColor = "border-teal-700";
    headerClass = "uppercase text-[12px] font-extrabold tracking-wide text-slate-900";
  }

  // ── Contact Line Helper ───────────────────────────────────────────────────

  const contactItems = [
    basics.email,
    basics.phone,
    basics.location,
    basics.linkedin?.replace(/^https?:\/\/(www\.)?/, ""),
    basics.github?.replace(/^https?:\/\/(www\.)?/, ""),
    basics.portfolio?.replace(/^https?:\/\/(www\.)?/, ""),
  ].filter(Boolean);

  // ── Section Renderers ─────────────────────────────────────────────────────

  const renderSectionHeader = (title: string) => (
    <div className="mb-2 mt-3.5 first:mt-0">
      <h3 className={`${accentColor} ${headerClass}`}>
        {title}
      </h3>
      <div
        className={`mt-0.5 border-b ${
          isModern ? "border-b-2" : isTechnical ? "border-b-2" : "border-b"
        } ${dividerColor}`}
      />
    </div>
  );

  const renderSummary = () => {
    if (!basics.summary?.trim()) return null;
    return (
      <div key="summary" className="mb-3">
        {renderSectionHeader("Professional Summary")}
        <p className="text-slate-700 text-justify">{basics.summary}</p>
      </div>
    );
  };

  const renderExperience = () => {
    if (!experience || experience.length === 0) return null;
    return (
      <div key="experience" className="mb-3">
        {renderSectionHeader("Experience")}
        <div className="space-y-3">
          {experience.map((exp) => (
            <div key={exp.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-slate-900 text-[12.5px]">
                  {exp.role || "Role"}
                </span>
                <span className="text-[11px] text-slate-600 italic">
                  {[exp.start_date, exp.current ? "Present" : exp.end_date]
                    .filter(Boolean)
                    .join(" – ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                <span>{exp.company}</span>
                {exp.location && (
                  <>
                    <span>&bull;</span>
                    <span>{exp.location}</span>
                  </>
                )}
              </div>
              {exp.bullets && exp.bullets.length > 0 && (
                <ul className="mt-1 list-disc pl-4 space-y-0.5 text-slate-700">
                  {exp.bullets.map((b) => (
                    <li key={b.id} className="pl-0.5">
                      {b.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEducation = () => {
    if (!education || education.length === 0) return null;
    return (
      <div key="education" className="mb-3">
        {renderSectionHeader("Education")}
        <div className="space-y-2">
          {education.map((edu) => (
            <div key={edu.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-slate-900 text-[12px]">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(" in ")}
                </span>
                <span className="text-[11px] text-slate-600 italic">
                  {[edu.start_date, edu.end_date].filter(Boolean).join(" – ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span>{edu.institution}</span>
                {edu.location && (
                  <>
                    <span>&bull;</span>
                    <span>{edu.location}</span>
                  </>
                )}
                {edu.gpa && (
                  <>
                    <span>&bull;</span>
                    <span className="font-medium text-slate-800">GPA: {edu.gpa}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    if (!skills || skills.length === 0) return null;
    return (
      <div key="skills" className="mb-3">
        {renderSectionHeader("Skills")}
        <div className="space-y-1">
          {skills.map((cat) => (
            <div key={cat.id} className="flex items-baseline gap-1.5 text-slate-800">
              <span className="font-bold text-slate-900 shrink-0">
                {cat.category}:
              </span>
              <span>{cat.items?.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjects = () => {
    if (!projects || projects.length === 0) return null;
    return (
      <div key="projects" className="mb-3">
        {renderSectionHeader("Projects")}
        <div className="space-y-2.5">
          {projects.map((proj) => (
            <div key={proj.id} className="space-y-0.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-[12px]">
                    {proj.name}
                  </span>
                  {proj.link && (
                    <span className="text-[10px] text-blue-600 italic">
                      — {proj.link.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </div>
              {proj.technologies && proj.technologies.length > 0 && (
                <div className="text-[10.5px] text-slate-500 font-medium">
                  {proj.technologies.join(" | ")}
                </div>
              )}
              {proj.bullets && proj.bullets.length > 0 && (
                <ul className="mt-0.5 list-disc pl-4 space-y-0.5 text-slate-700">
                  {proj.bullets.map((b) => (
                    <li key={b.id} className="pl-0.5">
                      {b.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCertifications = () => {
    if (!certifications || certifications.length === 0) return null;
    return (
      <div key="certifications" className="mb-3">
        {renderSectionHeader("Certifications")}
        <div className="space-y-1">
          {certifications.map((cert) => (
            <div key={cert.id} className="flex items-baseline justify-between">
              <span className="font-semibold text-slate-900 text-[11.5px]">
                {cert.name}{" "}
                <span className="font-normal text-slate-600">
                  {cert.issuer ? `— ${cert.issuer}` : ""}
                </span>
              </span>
              {cert.date && (
                <span className="text-[11px] text-slate-600 italic">
                  {cert.date}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const sectionMap: Record<string, () => React.ReactNode> = {
    summary: renderSummary,
    experience: renderExperience,
    education: renderEducation,
    skills: renderSkills,
    projects: renderProjects,
    certifications: renderCertifications,
  };

  return (
    <div className="flex flex-col h-full bg-secondary/10 border-l border-border/40 overflow-hidden">
      {/* Top Preview Controls Toolbar */}
      <div className="flex items-center justify-between border-b border-border/40 bg-card/60 px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => onChangePreviewType("html")}
            className={`rounded px-2 py-1 transition font-medium ${
              previewType === "html"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Live HTML Preview
          </button>
          <button
            type="button"
            onClick={() => {
              onChangePreviewType("pdf");
              if (!pdfBlobUrl) onRefreshPdf();
            }}
            className={`rounded px-2 py-1 transition font-medium flex items-center gap-1 ${
              previewType === "pdf"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Compiled PDF
            {isGeneratingPdf && <Loader2 className="h-3 w-3 animate-spin" />}
          </button>
        </div>

        {/* Zoom & Actions */}
        <div className="flex items-center gap-1.5">
          {previewType === "html" && (
            <div className="flex items-center gap-1 rounded border border-border/40 bg-secondary/20 p-0.5 text-xs">
              <button
                type="button"
                onClick={handleZoomOut}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                title="Reset Zoom"
              >
                {zoom}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {previewType === "pdf" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshPdf}
              disabled={isGeneratingPdf}
              className="h-7 text-xs gap-1 px-2"
            >
              <RefreshCw
                className={`h-3 w-3 ${isGeneratingPdf ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Recompile</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            className="h-7 text-xs gap-1 px-2"
            title="Download PDF"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center items-start bg-slate-900/10 dark:bg-black/40">
        {previewType === "pdf" ? (
          pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-full min-h-[600px] rounded-lg border border-border/40 shadow-xl bg-white"
              title="Compiled Resume PDF"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                  <p className="text-xs font-medium text-foreground">
                    Compiling ReportLab ATS PDF...
                  </p>
                </>
              ) : (
                <>
                  <FileText className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-xs font-medium text-foreground">
                    No compiled PDF loaded
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onRefreshPdf}
                    className="mt-3 text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Compile PDF
                  </Button>
                </>
              )}
            </div>
          )
        ) : (
          /* Live HTML Sheet (styled to exact ATS standards) */
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            className={`w-full max-w-[800px] min-h-[1050px] bg-white text-slate-900 rounded-sm shadow-2xl transition-transform duration-100 ${marginClass} ${fontSizeClass} font-sans`}
          >
            {/* Header / Name */}
            <div className={`mb-3 ${isMinimal ? "text-center" : ""}`}>
              <h1
                className={`font-bold tracking-tight text-slate-950 ${
                  isModern
                    ? "text-2xl text-slate-900"
                    : isMinimal
                    ? "text-xl uppercase tracking-widest text-slate-900"
                    : isTechnical
                    ? "text-xl text-slate-950 font-extrabold"
                    : "text-xl text-slate-900"
                }`}
              >
                {basics.name || "Candidate Name"}
              </h1>
              {basics.title && (
                <div
                  className={`mt-0.5 font-medium ${
                    isModern
                      ? "text-blue-600 text-[13px] font-semibold"
                      : isMinimal
                      ? "text-slate-600 text-[11px] uppercase tracking-wider"
                      : isTechnical
                      ? "text-teal-700 text-[12px] font-bold"
                      : "text-slate-600 text-[12px]"
                  }`}
                >
                  {basics.title}
                </div>
              )}
              {contactItems.length > 0 && (
                <div
                  className={`mt-1 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                    isMinimal ? "justify-center" : ""
                  }`}
                >
                  {contactItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-slate-400">|</span>}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {/* Sections in user-defined order */}
            {sectionOrder.map((sectionKey) => {
              const renderer = sectionMap[sectionKey];
              return renderer ? renderer() : null;
            })}

            {/* Empty state fallback */}
            {experience.length === 0 &&
              education.length === 0 &&
              skills.length === 0 &&
              !basics.summary && (
                <div className="py-20 text-center text-slate-400 text-xs italic">
                  Resume sections are empty. Add details in the editor to see live formatting.
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};
