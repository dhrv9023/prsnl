import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FileCheck, AlertCircle, Scale, ShieldAlert, Zap, Sparkles, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20">
        <div className="container max-w-4xl px-4 sm:px-6">
          {/* Header */}
          <div className="mb-12 border-b border-border/40 pb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border/50 text-xs font-medium text-muted-foreground mb-4">
              <Scale className="w-3.5 h-3.5 text-accent" />
              <span>User Agreement & Policies</span>
            </div>
            <h1 className="heading-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
              Please review these Terms of Service before using Kareerist. By accessing or using our platform, you agree to be bound by these terms.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-3 font-mono">
              Last updated: {lastUpdated}
            </p>
          </div>

          {/* Key Principles Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3">
                <FileCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Your Resume is Yours</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You retain full ownership of all documents, resumes, and text you upload to Kareerist.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/15 text-emerald-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Refund Protection</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Credits are automatically refunded if an AI inference request fails or times out.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Advisory Guidance</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our AI provides intelligence and scoring to assist you, but does not guarantee employment offers.
              </p>
            </div>
          </div>

          {/* Terms Content */}
          <div className="space-y-10 text-sm sm:text-base leading-relaxed text-foreground/90">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">01.</span>
                Acceptance & Eligibility
              </h2>
              <p className="text-muted-foreground">
                By creating an account, accessing, or using Kareerist ("Platform", "we", "us"), you acknowledge that you are at least 16 years of age and agree to abide by these Terms and our Privacy Policy. If you do not agree to these terms, do not access or use the Platform.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">02.</span>
                User Accounts & Anti-Farming Protection
              </h2>
              <p className="text-muted-foreground">
                To access features like resume analysis, mock interviews, and cover letters, you must create an account. You are responsible for maintaining the confidentiality of your login credentials:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>
                  <strong className="text-foreground">Initial Credits Allocation:</strong> New accounts receive 100 promotional credits upon verification. To maintain fair infrastructure access and prevent automated script abuse, initial promotional credit grants are limited to one per client IP address.
                </li>
                <li>
                  <strong className="text-foreground">Account Integrity:</strong> You may not create multiple dummy accounts, employ automated registration bots, or use disposable proxies to systematically harvest credits. Violations will result in automated IP blocking and account termination.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">03.</span>
                Credit System Rules & Refund Guarantee
              </h2>
              <p className="text-muted-foreground">
                Platform actions require credits according to the published feature schedule (e.g. ATS Score: 5 credits, Deep Analysis: 15 credits, Hiring Intelligence: 25 credits, AI Mock Interview: 25 credits, Cover Letter: 10 credits, Humanizer: 15 credits):
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>
                  <strong className="text-foreground">Daily Refills:</strong> Active users whose credit balance drops below 50 credits are eligible for an automated daily top-up to 50 credits to support ongoing job search activities.
                </li>
                <li>
                  <strong className="text-foreground">Automated Failure Refunds:</strong> If an AI feature call fails due to an upstream LLM timeout, connectivity disruption, or HTTP 502 error, the server-side transaction automatically refunds the deducted credits to your balance immediately.
                </li>
                <li>
                  <strong className="text-foreground">Non-Monetary Nature:</strong> Credits are virtual utility tokens specific to the Kareerist platform and have no cash or monetary surrender value.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">04.</span>
                AI Outputs & Employment Disclaimer
              </h2>
              <p className="text-muted-foreground">
                Kareerist leverages advanced generative models and heuristic algorithms to simulate recruiter evaluation and hiring workflows:
              </p>
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-foreground/90 space-y-2">
                <p className="text-xs sm:text-sm font-medium flex items-center gap-2 text-amber-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" /> Important Employment Advisory
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Our ATS scores, recruiter simulations, interview grades, and rewrites are intended for educational and career preparation purposes only. We do not guarantee that using Kareerist will result in interview invites, employment offers, or hiring decisions, as final recruitment choices rest solely with external employers.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">05.</span>
                Prohibited Conduct & Security Boundaries
              </h2>
              <p className="text-muted-foreground">
                You agree not to engage in any of the following unauthorized activities:
              </p>
              <ul className="space-y-2 pl-4 list-disc text-muted-foreground marker:text-accent">
                <li>Submitting adversarial prompt injections or payloads designed to compromise system prompts or extract internal AI instructions.</li>
                <li>Attempting to circumvent rate limits (SlowAPI), double-submit CSRF verification, or authentication cookies.</li>
                <li>Uploading corrupted, encrypted, or malicious files containing trojans, viruses, or embedded executable exploits.</li>
                <li>Reverse-engineering, scraping, or mass-downloading proprietary scoring algorithms, prompt architectures, or platform source code.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">06.</span>
                Intellectual Property & Ownership
              </h2>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Your Content:</strong> You retain all intellectual property rights to your uploaded resume documents, contact details, and career history. Kareerist claims no ownership over your career data.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Kareerist Property:</strong> The Kareerist brand, logo, user interface designs, custom visual gauges, scoring math engines, and backend architectures are proprietary assets owned by Kareerist.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">07.</span>
                Limitation of Liability & Termination
              </h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by applicable law, Kareerist and its operators shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our platform services. We reserve the right to suspend or terminate accounts that violate our security or anti-abuse policies without prior notice.
              </p>
            </section>

            {/* Section 8 */}
            <section className="space-y-3 border-t border-border/40 pt-8">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="text-xs font-mono text-accent">08.</span>
                Questions & Legal Inquiries
              </h2>
              <p className="text-muted-foreground">
                For legal notices, terms clarification, or platform questions, please contact our legal desk:
              </p>
              <div className="p-4 rounded-xl border border-border/40 bg-card/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
                <div>
                  <p className="font-medium text-foreground">Kareerist Legal Operations</p>
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
