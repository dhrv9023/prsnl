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
  const isClassic = templateId === "classic" || (!isModern && !isMinimal && !isTechnical);

  let accentColor = "text-black";
  let dividerColor = "border-black";
  let headerClass = "font-serif font-bold text-[12.5px] text-black tracking-normal";

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

  // ── Helper: Render Markdown Bold (**word**) ──────────────────────────────
  const renderMarkdownBold = (text: string | undefined): React.ReactNode => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-bold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // ── Contact Line Helper ───────────────────────────────────────────────────
  interface ContactEntry {
    label: string;
    url?: string;
  }

  const contactEntries: ContactEntry[] = [];
  if (isClassic) {
    if (basics.location) contactEntries.push({ label: basics.location });
    if (basics.phone) contactEntries.push({ label: basics.phone });
    if (basics.email) contactEntries.push({ label: basics.email, url: `mailto:${basics.email}` });
    if (basics.linkedin) {
      const url = basics.linkedin.startsWith("http") ? basics.linkedin : `https://${basics.linkedin}`;
      contactEntries.push({ label: "LinkedIn", url });
    }
    if (basics.github) {
      const url = basics.github.startsWith("http") ? basics.github : `https://${basics.github}`;
      contactEntries.push({ label: "GitHub", url });
    }
    if (basics.portfolio) {
      const url = basics.portfolio.startsWith("http") ? basics.portfolio : `https://${basics.portfolio}`;
      contactEntries.push({ label: "Portfolio", url });
    }
  } else {
    if (basics.email) contactEntries.push({ label: basics.email, url: `mailto:${basics.email}` });
    if (basics.phone) contactEntries.push({ label: basics.phone });
    if (basics.location) contactEntries.push({ label: basics.location });
    if (basics.linkedin) {
      contactEntries.push({
        label: basics.linkedin.replace(/^https?:\/\/(www\.)?/, ""),
        url: basics.linkedin.startsWith("http") ? basics.linkedin : `https://${basics.linkedin}`,
      });
    }
    if (basics.github) {
      contactEntries.push({
        label: basics.github.replace(/^https?:\/\/(www\.)?/, ""),
        url: basics.github.startsWith("http") ? basics.github : `https://${basics.github}`,
      });
    }
    if (basics.portfolio) {
      contactEntries.push({
        label: basics.portfolio.replace(/^https?:\/\/(www\.)?/, ""),
        url: basics.portfolio.startsWith("http") ? basics.portfolio : `https://${basics.portfolio}`,
      });
    }
  }

  // ── Section Renderers ─────────────────────────────────────────────────────

  const renderSectionHeader = (title: string) => {
    const displayTitle = isClassic
      ? title === "Professional Summary"
        ? "Summary"
        : title === "Skills"
        ? "Technical Skills"
        : title
      : title;

    return (
      <div className={`mb-1 ${isClassic ? "mt-2.5" : "mt-3.5"} first:mt-0`}>
        <h3 className={`${accentColor} ${headerClass}`}>
          {displayTitle}
        </h3>
        <div
          className={`mt-0.5 border-b ${
            isModern ? "border-b-2" : isTechnical ? "border-b-2" : "border-b"
          } ${dividerColor}`}
        />
      </div>
    );
  };

  const renderSummary = () => {
    if (!basics.summary?.trim()) return null;
    return (
      <div key="summary" className="mb-2.5">
        {renderSectionHeader("Professional Summary")}
        <p className={`text-justify ${isClassic ? "text-black font-serif text-[10.5px] leading-[1.38]" : "text-slate-700"}`}>
          {renderMarkdownBold(basics.summary)}
        </p>
      </div>
    );
  };

  const renderExperience = () => {
    if (!experience || experience.length === 0) return null;
    return (
      <div key="experience" className="mb-2.5">
        {renderSectionHeader("Experience")}
        <div className="space-y-2">
          {experience.map((exp) => {
            const dateRange = [exp.start_date, exp.current ? "Present" : exp.end_date]
              .filter(Boolean)
              .join(" – ");

            return (
              <div key={exp.id} className="space-y-0.5">
                {isClassic ? (
                  <div className="flex items-baseline justify-between font-serif text-[11px]">
                    <div>
                      <span className="font-bold text-black">{exp.role || "Role"}</span>
                      {exp.company && (
                        <>
                          <span className="text-black"> — </span>
                          <span className="font-bold text-black">{exp.company}</span>
                        </>
                      )}
                      {exp.location && <span className="text-neutral-700">, {exp.location}</span>}
                    </div>
                    {dateRange && <span className="text-black shrink-0 ml-2 text-[10.5px]">{dateRange}</span>}
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-900 text-[12.5px]">
                        {exp.role || "Role"}
                      </span>
                      <span className="text-[11px] text-slate-600 italic">
                        {dateRange}
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
                  </>
                )}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className={`list-disc pl-5 space-y-0.5 ${isClassic ? "text-black font-serif text-[10.5px] leading-[1.35] mt-0.5" : "mt-1 text-slate-700"}`}>
                    {exp.bullets.map((b) => (
                      <li key={b.id} className="pl-0.5">
                        {renderMarkdownBold(b.text)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEducation = () => {
    if (!education || education.length === 0) return null;
    return (
      <div key="education" className="mb-2.5">
        {renderSectionHeader("Education")}
        <div className="space-y-1.5">
          {education.map((edu) => {
            const degreeLine = [edu.degree, edu.field_of_study].filter(Boolean).join(" in ");
            const dateRange = [edu.start_date, edu.end_date].filter(Boolean).join(" – ");
            const hasGpaInDegree = degreeLine.includes("%") || degreeLine.toLowerCase().includes("gpa");
            const fullDegreeTitle = edu.gpa && !hasGpaInDegree
              ? `${degreeLine} — ${edu.gpa}`
              : degreeLine;

            return (
              <div key={edu.id} className="space-y-0.5">
                {isClassic ? (
                  <>
                    <div className="flex items-baseline justify-between font-serif text-[11px]">
                      <span className="font-bold text-black">{fullDegreeTitle}</span>
                      {dateRange && <span className="text-black shrink-0 ml-2 text-[10.5px]">{dateRange}</span>}
                    </div>
                    <div className="font-serif text-[10.5px] text-black">
                      {edu.institution}
                      {edu.location ? `, ${edu.location}` : ""}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-900 text-[12px]">
                        {degreeLine}
                      </span>
                      <span className="text-[11px] text-slate-600 italic">
                        {dateRange}
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
                  </>
                )}
                {edu.bullets && edu.bullets.length > 0 && (
                  <ul className={`list-disc pl-5 space-y-0.5 ${isClassic ? "text-black font-serif text-[10.5px] leading-[1.35] mt-0.5" : "mt-1 text-slate-700"}`}>
                    {edu.bullets.map((b) => (
                      <li key={b.id} className="pl-0.5">
                        {renderMarkdownBold(b.text)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSkills = () => {
    if (!skills || skills.length === 0) return null;
    return (
      <div key="skills" className="mb-2.5">
        {renderSectionHeader("Skills")}
        <div className="space-y-0.5">
          {skills.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-baseline gap-1 ${
                isClassic
                  ? "font-serif text-[10.5px] leading-[1.4] text-black"
                  : "text-slate-800"
              }`}
            >
              <span className={`font-bold shrink-0 ${isClassic ? "text-black" : "text-slate-900"}`}>
                {cat.category}:
              </span>
              <span>
                {isClassic ? cat.items?.join(" · ") : cat.items?.join(", ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProjects = () => {
    if (!projects || projects.length === 0) return null;
    return (
      <div key="projects" className="mb-2.5">
        {renderSectionHeader("Projects")}
        <div className="space-y-2">
          {projects.map((proj) => (
            <div key={proj.id} className="space-y-0.5">
              {isClassic ? (
                <>
                  <div className="flex items-baseline justify-between font-serif text-[11px]">
                    <div>
                      <span className="font-bold text-black">{proj.name}</span>
                      {proj.description && (
                        <>
                          <span className="text-black"> — </span>
                          <span className="font-bold text-black">{proj.description}</span>
                        </>
                      )}
                    </div>
                    {proj.link && (
                      <a
                        href={proj.link.startsWith("http") ? proj.link : `https://${proj.link}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-black hover:underline shrink-0 ml-2"
                      >
                        {proj.link.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="font-serif italic text-[10.5px] text-black">
                      {proj.technologies.join(", ")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-[12px]">
                        {proj.name}
                      </span>
                      {proj.description && (
                        <span className="text-[11px] text-slate-600">
                          — {proj.description}
                        </span>
                      )}
                      {proj.link && (
                        <span className="text-[10px] text-blue-600 italic">
                          ({proj.link.replace(/^https?:\/\/(www\.)?/, "")})
                        </span>
                      )}
                    </div>
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="text-[10.5px] text-slate-500 font-medium">
                      {proj.technologies.join(" | ")}
                    </div>
                  )}
                </>
              )}
              {proj.bullets && proj.bullets.length > 0 && (
                <ul className={`list-disc pl-5 space-y-0.5 ${isClassic ? "text-black font-serif text-[10.5px] leading-[1.35] mt-0.5" : "mt-0.5 text-slate-700"}`}>
                  {proj.bullets.map((b) => (
                    <li key={b.id} className="pl-0.5">
                      {renderMarkdownBold(b.text)}
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
      <div key="certifications" className="mb-2.5">
        {renderSectionHeader("Certifications")}
        <div className="space-y-0.5">
          {certifications.map((cert) => {
            const hasIssuerInName = cert.issuer && cert.name.toLowerCase().includes(cert.issuer.toLowerCase());
            const displayCert = cert.issuer && !hasIssuerInName
              ? `${cert.name} — ${cert.issuer}`
              : cert.name;

            return (
              <div
                key={cert.id}
                className={`flex items-baseline justify-between ${
                  isClassic
                    ? "font-serif text-[10.5px] leading-[1.4] text-black"
                    : "text-[11.5px]"
                }`}
              >
                <span className={isClassic ? "text-black" : "font-semibold text-slate-900"}>
                  {displayCert}
                </span>
                {cert.date && (
                  <span className={`shrink-0 ml-2 ${isClassic ? "text-black font-serif text-[10.5px]" : "text-[11px] text-slate-600 italic"}`}>
                    {cert.date}
                  </span>
                )}
              </div>
            );
          })}
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
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
              fontFamily: isClassic ? '"Times New Roman", Times, Georgia, serif' : undefined,
            }}
            className={`w-full max-w-[800px] min-h-[1050px] bg-white rounded-sm shadow-2xl transition-transform duration-100 ${marginClass} ${fontSizeClass} ${
              isClassic ? "font-serif text-black" : "font-sans text-slate-900"
            }`}
          >
            {/* Header / Name */}
            <div className={`mb-3 ${isClassic || isMinimal ? "text-center" : ""}`}>
              <h1
                className={`font-bold tracking-tight ${
                  isClassic
                    ? "text-[22px] font-serif text-black uppercase tracking-wide"
                    : isModern
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
              {!isClassic && basics.title && (
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
              {contactEntries.length > 0 && (
                <div
                  className={`mt-1 text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                    isClassic
                      ? "justify-center text-black font-serif text-[10.5px]"
                      : isMinimal
                      ? "justify-center text-slate-600"
                      : "text-slate-600"
                  }`}
                >
                  {contactEntries.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className={isClassic ? "text-black" : "text-slate-400"}>|</span>}
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`${isClassic ? "text-black hover:underline" : "hover:underline text-inherit"}`}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span>{item.label}</span>
                      )}
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
