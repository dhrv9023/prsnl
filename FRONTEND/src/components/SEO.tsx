import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noIndex?: boolean;
}

const DEFAULT_TITLE = "KAREERIST – AI-Powered Career Intelligence Platform";
const DEFAULT_DESCRIPTION =
  "Stop guessing your career path. Kareerist uses AI to simulate real hiring standards, analyze resumes against ATS filters, provide adaptive mock interviews, and build personalized career roadmaps.";
const DEFAULT_IMAGE = "https://kareerist.com/og-image.png";
const BASE_URL = "https://kareerist.com";

const ROUTE_META: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  "/": {
    title: "KAREERIST – AI-Powered Career Intelligence Platform",
    description: "The Operating System for your career. AI resume scoring, simulated mock interviews, and tailored career clarity structured around real hiring standards.",
  },
  "/resume-analysis": {
    title: "AI Resume Analysis & ATS Checker | Kareerist",
    description: "Instant ATS score, section-by-section critique, and recruiter-grade insights to optimize your resume for top engineering and tech roles.",
  },
  "/interview": {
    title: "AI Voice Mock Interview Simulator | Kareerist",
    description: "Practice realistic, adaptive technical and behavioral interviews with real-time AI speech transcription, scoring, and feedback.",
  },
  "/interview/history": {
    title: "Interview History & Feedback Reports | Kareerist",
    description: "Review past interview transcripts, question-by-question scoring breakdowns, and areas for improvement.",
    noIndex: true,
  },
  "/cover-letter": {
    title: "AI Cover Letter Generator | Kareerist",
    description: "Generate tailored, authentic, human-sounding cover letters aligned with specific job descriptions and company culture.",
  },
  "/pricing": {
    title: "Pricing & Credit Packs | Kareerist",
    description: "Simple, transparent pay-as-you-go credit packs. 100 free credits upon signup. No recurring subscriptions or hidden fees.",
  },
  "/dashboard": {
    title: "Career Command Center | Kareerist",
    description: "Monitor your ATS match rate, mock interview performance, and active career roadmaps in one unified dashboard.",
    noIndex: true,
  },
  "/credits": {
    title: "Credits & Usage | Kareerist",
    description: "View your remaining Kareerist credits, recent transaction history, and feature pricing.",
    noIndex: true,
  },
  "/contact": {
    title: "Contact & Support | Kareerist",
    description: "Have questions, feature requests, or need technical support? Get in touch directly with the Kareerist engineering team.",
  },
  "/privacy": {
    title: "Privacy Policy | Kareerist",
    description: "Learn how Kareerist protects your resume data, personal identity, and interview recordings with end-to-end privacy guarantees.",
  },
  "/terms": {
    title: "Terms of Service | Kareerist",
    description: "Review terms and conditions for using Kareerist's AI career tools, credit balances, and platform services.",
  },
  "/admin": {
    title: "Platform Admin Console | Kareerist",
    description: "Internal administrator analytics, user management, and credit allocation dashboard.",
    noIndex: true,
  },
};

function updateMetaTag(attributeName: string, attributeValue: string, content: string) {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function updateLinkRel(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export function updatePageSEO(props: SEOProps) {
  const title = props.title || DEFAULT_TITLE;
  const description = props.description || DEFAULT_DESCRIPTION;
  const image = props.ogImage || DEFAULT_IMAGE;
  const type = props.ogType || "website";
  const url = props.canonical || window.location.href;

  // Set Title
  document.title = title;

  // Basic Meta
  updateMetaTag("name", "description", description);

  // Open Graph
  updateMetaTag("property", "og:title", title);
  updateMetaTag("property", "og:description", description);
  updateMetaTag("property", "og:image", image);
  updateMetaTag("property", "og:type", type);
  updateMetaTag("property", "og:url", url);

  // Twitter Card
  updateMetaTag("name", "twitter:card", "summary_large_image");
  updateMetaTag("name", "twitter:title", title);
  updateMetaTag("name", "twitter:description", description);
  updateMetaTag("name", "twitter:image", image);

  // Canonical
  updateLinkRel("canonical", url);

  // Robots indexing directive
  if (props.noIndex) {
    updateMetaTag("name", "robots", "noindex, nofollow");
  } else {
    updateMetaTag("name", "robots", "index, follow");
  }
}

/** Route-aware SEO synchronizer to place once inside BrowserRouter */
export function RouteSEOManager() {
  const location = useLocation();

  useEffect(() => {
    const routeConfig = ROUTE_META[location.pathname];
    if (routeConfig) {
      updatePageSEO({
        title: routeConfig.title,
        description: routeConfig.description,
        canonical: `${BASE_URL}${location.pathname === "/" ? "" : location.pathname}`,
        noIndex: routeConfig.noIndex,
      });
    } else {
      // 404 or unknown route
      updatePageSEO({
        title: "Page Not Found (404) | Kareerist",
        description: "The page you are looking for does not exist on Kareerist.",
        noIndex: true,
      });
    }
  }, [location.pathname]);

  return null;
}

/** Component for explicit per-page overrides */
export function SEO(props: SEOProps) {
  useEffect(() => {
    updatePageSEO(props);
  }, [props.title, props.description, props.canonical, props.ogImage, props.noIndex]);

  return null;
}
