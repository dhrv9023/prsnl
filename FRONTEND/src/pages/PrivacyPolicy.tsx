import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Shield, Lock, Eye, Server, RefreshCw, Mail, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container max-w-4xl px-4 sm:px-6">
          {/* Header */}
          <div className="mb-12 border-b border-border/40 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border/50 text-xs font-medium text-muted-foreground mb-4">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Legal & Transparency</span>
            </div>
            <h1 className="heading-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
              At Kareerist, we take your career data and privacy seriously. This policy explains what information we collect, how our AI pipelines process it, and how your data is safeguarded.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-3 font-mono">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">No AI Training</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your resumes, job descriptions, and mock interview answers are never used to train foundation models.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent-teal/15 text-accent-teal flex items-center justify-center mb-3">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Strict Isolation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Row Level Security (RLS) and server-side scoping guarantee only you can access your saved resumes and reports.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Server className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Ephemeral Audio</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Voice interview audio is transcribed via Whisper on the fly and never permanently stored.
              </p>
            </div>
          </div>

          {/* Policy Body */}
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground/90">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">01.</span>
                Information We Collect
              </h2>
              <p className="text-muted-foreground">
                When you use Kareerist, we collect information that is necessary to deliver career intelligence services:
              </p>
              <ul className="space-y-2.5 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>
                  <strong className="text-foreground">Account Information:</strong> When signing up, we receive your email address and authentication credentials via Supabase Auth (or basic profile metadata like name and avatar when authenticating through Google OAuth).
                </li>
                <li>
                  <strong className="text-foreground">Resume Data:</strong> When uploading a resume PDF, our server extracts text content using secure server-side parsers. The raw PDF is stored securely in an encrypted storage bucket, and extracted text is parsed to compute ATS match scores and AI critiques.
                </li>
                <li>
                  <strong className="text-foreground">Job Descriptions & Preferences:</strong> Any job description text, targeted job titles, or experience levels you submit to run comparisons.
                </li>
                <li>
                  <strong className="text-foreground">Voice Recordings (Mock Interviews):</strong> When using the microphone in our AI Mock Interview simulator, audio streams are submitted strictly to perform speech-to-text transcription.
                </li>
                <li>
                  <strong className="text-foreground">Usage & Network Logs:</strong> Standard request telemetry such as IP addresses (used for rate-limiting and anti-abuse verification), browser user-agent, and anonymized error traces via Sentry.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">02.</span>
                How We Use Your Data
              </h2>
              <p className="text-muted-foreground">
                We process your information exclusively to provide and improve platform functionality:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-foreground/90">Generating ATS match scores, deep resume critiques, and recruiter perspective reports.</span>
                </div>
                <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-foreground/90">Conducting interactive 6-question mock interview evaluations.</span>
                </div>
                <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-foreground/90">Generating and humanizing personalized cover letters.</span>
                </div>
                <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/30 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-foreground/90">Managing your account credit balance and preventing fraud/credit farming.</span>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">03.</span>
                AI Processing & Third-Party Service Providers
              </h2>
              <p className="text-muted-foreground">
                Kareerist leverages enterprise-grade AI inference APIs. Your data is transmitted over TLS-encrypted channels to the following providers:
              </p>
              <ul className="space-y-2.5 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>
                  <strong className="text-foreground">Groq Cloud:</strong> Powers our high-speed large language model inference (Llama 3.3 / Qwen) and Whisper voice transcription. Groq does not retain your prompts or audio to train models.
                </li>
                <li>
                  <strong className="text-foreground">HuggingFace Inference API:</strong> Generates semantic text embeddings (sentence-transformers) to calculate cosine similarity between resumes and job descriptions.
                </li>
                <li>
                  <strong className="text-foreground">Supabase Platform:</strong> Hosts our PostgreSQL database, file storage buckets, and authentication engine with encrypted storage and automated backups.
                </li>
                <li>
                  <strong className="text-foreground">Upstash Redis:</strong> Manages transient mock interview session states (45-minute TTL) and rate limit counters.
                </li>
                <li>
                  <strong className="text-foreground">Sentry:</strong> Monitors application health and uncaught runtime exceptions. PII (personally identifiable information) is stripped from error payloads.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">04.</span>
                Audio & Speech Data Safeguards
              </h2>
              <p className="text-muted-foreground">
                When practicing in the AI Mock Interview with voice mode enabled:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>Microphone access is explicitly requested by your browser and only activated when you press the microphone recording button.</li>
                <li>Recorded audio segments are uploaded via secured endpoints, validated for size (&lt;10MB) and format (WebM/WAV/MP4), transcribed into text via Whisper, and immediately discarded.</li>
                <li>We do not build voice biometrics or acoustic voiceprints of users.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">05.</span>
                Cookies & Authentication Security
              </h2>
              <p className="text-muted-foreground">
                Kareerist uses secure, modern cookie architecture to keep your session safe:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>
                  <strong className="text-foreground">HttpOnly Session Cookies:</strong> Authentication tokens (<code className="text-xs px-1.5 py-0.5 rounded bg-secondary">__krs_sid</code> and <code className="text-xs px-1.5 py-0.5 rounded bg-secondary">__krs_rid</code>) cannot be read by browser JavaScript, protecting against cross-site scripting (XSS) credential theft.
                </li>
                <li>
                  <strong className="text-foreground">Double-Submit CSRF Token:</strong> A readable verification cookie (<code className="text-xs px-1.5 py-0.5 rounded bg-secondary">__krs_xsrf</code>) is validated against custom request headers on state-changing operations to protect against cross-site request forgery.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">06.</span>
                Your Rights & Data Control
              </h2>
              <p className="text-muted-foreground">
                You maintain complete control over your career portfolio:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>You can access, view, and inspect all past analyses, resume uploads, and interview reports from your <Link to="/dashboard" className="text-foreground underline underline-offset-2 hover:text-accent">Dashboard</Link>.</li>
                <li>You may request complete deletion of your profile, resume files, and analysis records at any time by contacting our support team.</li>
                <li>You can export your cover letters as PDFs client-side without storing additional copies on our servers.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-3 border-t border-border/40 pt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">07.</span>
                Contact Us
              </h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, your personal data, or wish to exercise your data protection rights, reach out to us:
              </p>
              <div className="p-4 rounded-xl border border-border/40 bg-card/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
                <div>
                  <p className="font-medium text-foreground">Kareerist Data Privacy Desk</p>
                  <p className="text-xs text-muted-foreground">Gurugram, Haryana, India</p>
                  <a href="mailto:kareerist2@gmail.com" className="text-sm text-accent hover:underline flex items-center gap-1.5 mt-1 font-mono">
                    <Mail className="w-3.5 h-3.5" /> kareerist2@gmail.com
                  </a>
                </div>
                <Link
                  to="/contact"
                  className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors shrink-0"
                >
                  Contact Support →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
