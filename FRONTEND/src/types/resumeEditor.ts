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
  | "basics"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications";

export const ALL_SECTION_KEYS: SectionKey[] = [
  "basics",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
];

export const ORDERABLE_SECTION_KEYS: SectionKey[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
];

/** Available ATS-safe resume templates. */
export type TemplateId = "classic" | "modern" | "minimal" | "technical";

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
 * Creates a schema-valid StructuredResume populated with professional
 * John Doe mock data for the "create from scratch" flow.
 */
export function createEmptyResume(): StructuredResume {
  return getJohnDoeMockResume();
}

export function getJohnDoeMockResume(templateId: TemplateId = "classic"): StructuredResume {
  return {
    basics: {
      name: "John Doe",
      title: "Senior Full-Stack Software Engineer",
      email: "john.doe@example.com",
      phone: "+1 (555) 234-5678",
      location: "San Francisco, CA",
      linkedin: "https://linkedin.com/in/johndoe",
      github: "https://github.com/johndoe",
      portfolio: "https://johndoe.dev",
      summary:
        "High-impact Full-Stack Engineer with 6+ years of experience designing and scaling resilient cloud applications and distributed systems. Expert in TypeScript, Python, React, FastAPI, and Kubernetes. Proven track record of improving latency by 40% and leading engineering teams to deliver mission-critical software.",
    },
    experience: [
      {
        id: newId(),
        company: "TechCorp Solutions",
        role: "Senior Full-Stack Engineer",
        location: "San Francisco, CA",
        start_date: "Jan 2022",
        end_date: "Present",
        current: true,
        bullets: [
          createBullet(
            "Architected and deployed real-time data streaming pipeline processing 15M+ events daily with 99.99% uptime."
          ),
          createBullet(
            "Spearheaded backend migration from monolithic architecture to FastAPI microservices, reducing P99 API latency by 42%."
          ),
          createBullet(
            "Mentored 5 junior and mid-level engineers in distributed system design, clean architecture, and automated test coverage."
          ),
        ],
      },
      {
        id: newId(),
        company: "DataFlow Inc",
        role: "Software Engineer",
        location: "San Jose, CA",
        start_date: "Jun 2019",
        end_date: "Dec 2021",
        current: false,
        bullets: [
          createBullet(
            "Engineered responsive React web dashboard adopted by 25,000+ monthly active enterprise customers."
          ),
          createBullet(
            "Optimized complex PostgreSQL aggregation queries, decreasing average dashboard load times from 3.2s to 650ms."
          ),
          createBullet(
            "Implemented automated CI/CD pipeline using GitHub Actions and Docker, accelerating release cycle by 3x."
          ),
        ],
      },
    ],
    education: [
      {
        id: newId(),
        institution: "University of California, Berkeley",
        degree: "Bachelor of Science",
        field_of_study: "Computer Science",
        location: "Berkeley, CA",
        start_date: "2015",
        end_date: "2019",
        gpa: "3.8 / 4.0",
        bullets: [
          createBullet(
            "Dean's Honors List (all 8 semesters); Course Leader for Data Structures & Algorithms."
          ),
        ],
      },
    ],
    skills: [
      {
        id: newId(),
        category: "Languages",
        items: ["TypeScript", "JavaScript", "Python", "Go", "SQL", "HTML/CSS"],
      },
      {
        id: newId(),
        category: "Frameworks & Libs",
        items: ["React", "Next.js", "FastAPI", "Node.js", "TailwindCSS", "Redux"],
      },
      {
        id: newId(),
        category: "Cloud & DevOps",
        items: ["AWS (ECS, S3, RDS)", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Git"],
      },
    ],
    projects: [
      {
        id: newId(),
        name: "CloudMetrics Monitor",
        description: "Open-source observability toolkit for Kubernetes container metrics.",
        link: "https://github.com/johndoe/cloudmetrics",
        technologies: ["Go", "React", "Prometheus", "Docker"],
        bullets: [
          createBullet(
            "Built real-time container metrics visualizer with custom alerting engine; garnered 1,200+ GitHub stars."
          ),
        ],
      },
    ],
    certifications: [
      {
        id: newId(),
        name: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "2023",
        url: "https://aws.amazon.com/verification",
      },
    ],
    meta: {
      template_id: templateId,
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
