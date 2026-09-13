/**
 * resumeEditor.ts
 *
 * TypeScript interfaces that mirror backend/app/schemas/resume_editor.py
 * exactly. These types are the single client-side source of truth for all
 * Resume Editor state, API payloads, and preview rendering logic.
 *
 * Any structural change here must be reflected in the Pydantic counterpart
 * and vice-versa to maintain end-to-end type safety.
 */

// ── Leaf-level atoms ─────────────────────────────────────────────────────────

/** A single bullet-point entry within a résumé section. */
export interface ResumeBullet {
  /** Stable UUID used to map AI Deep Analysis fixes to exact bullets. */
  id: string;
  text: string;
}

// ── Top-level sections ────────────────────────────────────────────────────────

/** Candidate header: name, contact details, and professional summary. */
export interface ResumeBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  summary: string;
}

/** A single position in the work-history section. */
export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  location?: string;
  start_date: string;
  end_date: string;
  current: boolean;
  bullets: ResumeBullet[];
}

/** A degree, course, or academic credential. */
export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field_of_study?: string;
  location?: string;
  start_date: string;
  end_date: string;
  gpa?: string;
  bullets: ResumeBullet[];
}

/** A labelled group of skills (e.g. "Languages", "Frameworks", "Tools"). */
export interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

/** A personal, academic, or open-source project. */
export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  link?: string;
  technologies: string[];
  bullets: ResumeBullet[];
}

/** A professional certification, license, or course completion. */
export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

// ── Document meta ─────────────────────────────────────────────────────────────

/** Valid section key identifiers — controls rendering order and section routing. */
export type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

export const ALL_SECTION_KEYS: SectionKey[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
];

/** Available ATS-safe resume templates. */
export type TemplateId = "classic" | "modern";

/** Body font-size scale. */
export type FontSize = "compact" | "medium" | "large";

/** Page margin preset. */
export type Margins = "compact" | "normal" | "spacious";

/** Document-level display settings persisted inside structured_content. */
export interface EditorMeta {
  template_id: TemplateId;
  font_size: FontSize;
  margins: Margins;
  /** Ordered array of SectionKey — drives both preview and PDF rendering order. */
  section_order: SectionKey[];
}

// ── Root document model ───────────────────────────────────────────────────────

/**
 * Root schema for a Kareerist Resume Editor document.
 *
 * This is:
 *  - the payload shape for PUT /api/v1/resumes/{id}/editor
 *  - the response shape for GET /api/v1/resumes/{id}/editor (structured_content)
 *  - the state type managed by useResumeEditor hook
 *  - the data source for ResumePreviewSheet rendering
 */
export interface StructuredResume {
  basics: ResumeBasics;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillCategory[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  meta: EditorMeta;
}

// ── API response shapes ───────────────────────────────────────────────────────

/**
 * A single AI analysis issue surfaced from ai_analyses.output_data,
 * enriched with a matched bullet ID (if the issue was matched to a specific
 * bullet in structured_content during GET /editor).
 */
export interface AnalysisIssue {
  /** Unique identifier for this issue within the current analysis session. */
  id: string;
  /** The section this issue was found in (e.g. "experience", "education"). */
  section: string;
  /** Original phrasing of the candidate's text. */
  original: string;
  /** Explanation of why the original is weak. */
  critique: string;
  /** AI-recommended high-impact rewrite. */
  fix: string;
  /**
   * If the issue was successfully matched to a specific bullet in
   * structured_content, this holds the bullet's UUID. Otherwise null.
   */
  matched_bullet_id: string | null;
}

/** Response shape for GET /api/v1/resumes/{id}/editor */
export interface ResumeEditorPayload {
  id: string;
  structured_content: StructuredResume;
  analysis_issues: AnalysisIssue[];
  file_url: string;
  last_saved: string | null;
}

/** Request payload for POST /api/v1/resumes/{id}/rewrite_bullet */
export interface BulletRewriteRequest {
  bullet_text: string;
  role_context: string;
  instruction?: string;
}

/** Response for POST /api/v1/resumes/{id}/rewrite_bullet */
export interface BulletRewriteResponse {
  rewritten_bullet: string;
  credits_remaining: number;
}

// ── Editor UI state helpers ───────────────────────────────────────────────────

/**
 * Creates a minimal, schema-valid empty StructuredResume for the
 * "create from scratch" flow.
 */
export function createEmptyResume(): StructuredResume {
  return {
    basics: {
      name: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: "",
      summary: "",
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    meta: {
      template_id: "classic",
      font_size: "medium",
      margins: "normal",
      section_order: [...ALL_SECTION_KEYS],
    },
  };
}

/**
 * Generates a UUID-like identifier for new bullet / entry items.
 * Falls back to a timestamp-based id in environments without crypto.
 */
export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/**
 * Creates a blank ResumeBullet with a fresh stable UUID.
 */
export function createBullet(text = ""): ResumeBullet {
  return { id: newId(), text };
}
