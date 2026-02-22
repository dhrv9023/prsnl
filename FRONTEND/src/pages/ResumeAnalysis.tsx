import { useState, useRef, useEffect, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
    Upload,
    FileText,
    Loader2,
    BarChart3,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    ChevronRight,
    User,
    X,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface MatchResult {
    score: number;
    raw_similarity: number;
    warning?: string;
}

interface RoastSection {
    score: string;
    feedback: string;
    issues?: string;
    missing_keywords?: string;
}

interface RoastResult {
    overall_feedback: string;
    summary: string;
    sections: Record<string, RoastSection>;
    action_items: string[];
}

interface AnalysisData {
    structuralFeedback: string[];
    signals: { label: string; value: number }[];
    recommendation: string;
}

// ── Workflow Steps ─────────────────────────────────────

const workflowSteps = ["Resume", "Analysis", "Improve", "Recheck"];

// ── Animated Counter Hook ──────────────────────────────

function useAnimatedCounter(target: number, duration = 1200) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (target <= 0) { setCount(0); return; }
        let start = 0;
        const startTime = performance.now();

        function step(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(eased * target);
            setCount(current);
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }, [target, duration]);

    return count;
}

// ── Progress Bar Component ─────────────────────────────

function ProgressBar({ value, max = 100, delay = 0 }: { value: number; max?: number; delay?: number }) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setWidth((value / max) * 100);
        }, 100 + delay);
        return () => clearTimeout(timeout);
    }, [value, max, delay]);

    return (
        <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
            <div
                className="h-full bg-foreground/70 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${width}%` }}
            />
        </div>
    );
}

// ── Resume Preview Sections (Placeholder) ──────────────

const resumeSections = [
    {
        title: "Professional Summary",
        content:
            "Experienced software engineer with 5+ years building scalable web applications. Passionate about clean architecture and developer experience.",
    },
    {
        title: "Experience",
        content: `Senior Software Engineer — Acme Corp
Jan 2022 – Present
• Led migration of monolithic API to microservices architecture
• Reduced deployment time by 40% through CI/CD pipeline optimization
• Mentored team of 4 junior engineers

Software Engineer — StartupXYZ
Jun 2019 – Dec 2021
• Built real-time data visualization dashboard serving 10k+ daily users
• Implemented OAuth 2.0 authentication system
• Optimized database queries reducing response time by 60%`,
    },
    {
        title: "Skills",
        content:
            "TypeScript, React, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS, GraphQL, REST APIs, CI/CD",
    },
    {
        title: "Education",
        content: `B.S. Computer Science — State University
2015 – 2019 | GPA 3.8/4.0`,
    },
];

// ── Page ───────────────────────────────────────────────

export default function ResumeAnalysis() {
    const [file, setFile] = useState<File | null>(null);
    const [jobDesc, setJobDesc] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingLabel, setLoadingLabel] = useState("");
    const [error, setError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Workflow step
    const [currentStep, setCurrentStep] = useState(0);

    // Results
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [roastResult, setRoastResult] = useState<RoastResult | null>(null);

    // Derived analysis data
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

    // Animate score
    const animatedScore = useAnimatedCounter(matchResult?.score ?? 0);

    // Derive analysis data from roast result
    useEffect(() => {
        if (roastResult) {
            const structuralFeedback: string[] = [];
            const sectionEntries = Object.entries(roastResult.sections);

            sectionEntries.forEach(([key, section]) => {
                if (section.feedback) {
                    structuralFeedback.push(section.feedback);
                }
                if (section.issues) {
                    structuralFeedback.push(section.issues);
                }
            });

            // Derive signal values from section scores
            const scoreMap: Record<string, number> = {};
            sectionEntries.forEach(([key, section]) => {
                const scoreStr = section.score?.toLowerCase() || "";
                let val = 50;
                if (scoreStr === "excellent" || scoreStr === "very good") val = 90;
                else if (scoreStr === "good") val = 70;
                else if (scoreStr === "fair" || scoreStr === "average") val = 50;
                else if (scoreStr === "poor" || scoreStr === "needs improvement") val = 30;
                scoreMap[key] = val;
            });

            const signals = [
                { label: "Impact", value: scoreMap["impact"] || scoreMap["experience"] || 65 },
                { label: "Clarity", value: scoreMap["clarity"] || scoreMap["summary"] || 60 },
                { label: "Keyword Match", value: matchResult ? Math.round(matchResult.score * 0.9) : 55 },
                { label: "Role Alignment", value: matchResult ? Math.round(matchResult.raw_similarity * 100) : 50 },
            ];

            setAnalysisData({
                structuralFeedback: structuralFeedback.slice(0, 5),
                signals,
                recommendation:
                    roastResult.action_items?.[0] ||
                    "Add measurable achievements to your experience section to increase ATS performance by 8–12 points.",
            });
        }
    }, [roastResult, matchResult]);

    // Drag-and-drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type === "application/pdf") {
            setFile(droppedFile);
            setCurrentStep(0);
        }
    }, []);

    const handleAnalyze = async () => {
        if (!file || !jobDesc.trim()) {
            setError("Upload a resume PDF and enter a job description.");
            return;
        }
        setError("");
        setMatchResult(null);
        setRoastResult(null);
        setAnalysisData(null);
        setResumeId(null);
        setIsLoading(true);
        setCurrentStep(1);

        try {
            // Placeholder — backend not connected
            setLoadingLabel("Analyzing resume…");
            await new Promise((r) => setTimeout(r, 1500));
            setResumeId("demo");

            setLoadingLabel("Calculating ATS match score…");
            await new Promise((r) => setTimeout(r, 1000));
            setMatchResult({ score: 72, raw_similarity: 0.68 });

            setLoadingLabel("Running deep analysis…");
            setCurrentStep(2);
            await new Promise((r) => setTimeout(r, 1200));
            setRoastResult({
                overall_feedback: "Good resume with room for improvement.",
                summary: "Your resume shows strong technical skills but could benefit from more measurable impact statements.",
                sections: {
                    experience: { score: "Good", feedback: "Add quantifiable achievements to strengthen impact.", issues: "Some bullet points lack specificity." },
                    skills: { score: "Very Good", feedback: "Strong technical skill coverage.", missing_keywords: "Cloud infrastructure keywords could be added." },
                    summary: { score: "Fair", feedback: "Professional summary could be more targeted to the role." },
                },
                action_items: [
                    "Add measurable achievements to your experience section to increase ATS performance.",
                    "Tailor your professional summary to match the target role.",
                    "Include relevant cloud/infrastructure keywords.",
                ],
            });
            setCurrentStep(2);
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setIsLoading(false);
            setLoadingLabel("");
        }
    };

    const scoreColor = (score: number) =>
        score >= 70
            ? "text-emerald-400"
            : score >= 40
                ? "text-amber-400"
                : "text-red-400";

    const scoreBg = (score: number) =>
        score >= 70
            ? "bg-emerald-400"
            : score >= 40
                ? "bg-amber-400"
                : "bg-red-400";

    const hasResults = matchResult || roastResult;

    return (
        <div className="min-h-screen flex flex-col dark bg-background text-foreground">
            <Navbar />

            <main className="flex-grow pt-20">
                {/* ── Product Header ──────────────────────────── */}
                <div className="border-b border-border/40">
                    <div className="container max-w-[1400px] mx-auto px-6 flex items-center justify-between h-14">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-4 h-4 text-foreground/60" />
                            <span className="text-sm font-semibold tracking-tight text-foreground">
                                Resume Intelligence
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <a
                                href="/"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Dashboard
                            </a>
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Workflow Stepper ────────────────────────── */}
                <div className="border-b border-border/20">
                    <div className="container max-w-[1400px] mx-auto px-6">
                        <div className="flex items-center gap-1 h-10 overflow-x-auto">
                            {workflowSteps.map((step, i) => (
                                <div key={step} className="flex items-center">
                                    <div
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${i === currentStep
                                            ? "text-foreground bg-secondary/60"
                                            : i < currentStep
                                                ? "text-foreground/60"
                                                : "text-muted-foreground/40"
                                            }`}
                                    >
                                        <span
                                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono ${i < currentStep
                                                ? "bg-foreground/20 text-foreground/80"
                                                : i === currentStep
                                                    ? "bg-foreground/10 text-foreground"
                                                    : "bg-border/30 text-muted-foreground/30"
                                                }`}
                                        >
                                            {i < currentStep ? "✓" : i + 1}
                                        </span>
                                        {step}
                                    </div>
                                    {i < workflowSteps.length - 1 && (
                                        <ChevronRight className="w-3 h-3 text-muted-foreground/20 mx-1 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Main Content (Two Column) ──────────────── */}
                <div className="container max-w-[1400px] mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* ── LEFT: Resume Preview (60%) ─────────── */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Upload / Drag-Drop */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !file && fileInputRef.current?.click()}
                                className={`relative border border-dashed rounded-lg transition-all duration-200 ${isDragOver
                                    ? "border-foreground/40 bg-secondary/40"
                                    : file
                                        ? "border-border/30 bg-transparent cursor-default"
                                        : "border-border/40 hover:border-foreground/20 cursor-pointer"
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        setFile(e.target.files?.[0] || null);
                                        setCurrentStep(0);
                                    }}
                                />

                                {file ? (
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-foreground/60" />
                                            <span className="text-sm font-medium text-foreground truncate max-w-xs">
                                                {file.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {(file.size / 1024).toFixed(0)} KB
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setMatchResult(null);
                                                setRoastResult(null);
                                                setAnalysisData(null);
                                                setCurrentStep(0);
                                            }}
                                            className="p-1 rounded hover:bg-secondary/60 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-10 flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg border border-border/40 bg-secondary/30 flex items-center justify-center">
                                            <Upload className="w-4 h-4 text-muted-foreground/60" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm text-foreground/80 font-medium">
                                                Upload Resume
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Drag & drop your PDF or click to browse
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Resume Document Canvas */}
                            <div className="resume-canvas rounded-lg overflow-hidden">
                                <div className="bg-white dark:bg-[#fafafa] min-h-[600px] p-8 md:p-12 space-y-6">
                                    {resumeSections.map((section, i) => (
                                        <div
                                            key={section.title}
                                            className="group relative px-3 py-2 -mx-3 rounded transition-colors duration-200 hover:bg-black/[0.02]"
                                        >
                                            {/* Future annotation marker */}
                                            {/* TODO: model-based highlights will be injected here */}
                                            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-2">
                                                {section.title}
                                            </h3>
                                            <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line font-[system-ui]">
                                                {section.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Job Description Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    Job Description
                                </label>
                                <textarea
                                    value={jobDesc}
                                    onChange={(e) => setJobDesc(e.target.value)}
                                    rows={5}
                                    className="w-full bg-secondary/30 border border-border/40 rounded-lg p-4 text-sm text-foreground placeholder-muted-foreground/50 resize-none focus:outline-none focus:border-foreground/20 focus:ring-1 focus:ring-foreground/5 transition-all duration-200"
                                    placeholder="Paste the target job description here…"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className="w-full h-11 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>{loadingLabel}</span>
                                    </>
                                ) : (
                                    <>
                                        Analyze Resume
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* ── RIGHT: Analysis Panels (40%) ───────── */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Panel 1 — ATS Score */}
                            <div className="analysis-panel rounded-xl border border-border/40 bg-card p-6 space-y-5">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    ATS Score
                                </p>

                                {matchResult ? (
                                    <div className="space-y-4">
                                        <div className="flex items-end gap-2">
                                            <span
                                                className={`text-5xl font-bold tracking-tighter tabular-nums ${scoreColor(
                                                    matchResult.score
                                                )}`}
                                            >
                                                {animatedScore}
                                            </span>
                                            <span className="text-lg text-muted-foreground/50 font-light mb-1">
                                                / 100
                                            </span>
                                        </div>

                                        {/* Score Progress Bar */}
                                        <div className="h-2 w-full bg-border/30 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreBg(
                                                    matchResult.score
                                                )}`}
                                                style={{ width: `${matchResult.score}%` }}
                                            />
                                        </div>

                                        {/* Interpretation */}
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {matchResult.score >= 70
                                                ? "Strong formatting. Good keyword alignment with the target role."
                                                : matchResult.score >= 40
                                                    ? "Decent structure. Impact clarity and keyword density can improve."
                                                    : "Significant gaps in keyword match and structural alignment."}
                                        </p>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-2">
                                            {matchResult.score >= 50 && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-2.5 py-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    ATS Friendly
                                                </span>
                                            )}
                                            {matchResult.score < 80 && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-2.5 py-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Needs Measurable Impact
                                                </span>
                                            )}
                                        </div>

                                        {matchResult.warning && (
                                            <p className="text-xs text-amber-400/80 mt-1">
                                                {matchResult.warning}
                                            </p>
                                        )}
                                    </div>
                                ) : isLoading ? (
                                    <div className="flex items-center gap-3 py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Calculating score…
                                        </span>
                                    </div>
                                ) : (
                                    <div className="py-6">
                                        <div className="flex items-end gap-2">
                                            <span className="text-5xl font-bold tracking-tighter text-muted-foreground/20 tabular-nums">
                                                —
                                            </span>
                                            <span className="text-lg text-muted-foreground/20 font-light mb-1">
                                                / 100
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-border/20 rounded-full mt-4" />
                                        <p className="text-sm text-muted-foreground/40 mt-4">
                                            Upload resume and run analysis to see your score.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Panel 2 — Structural Analysis */}
                            <div className="analysis-panel rounded-xl border border-border/40 bg-card p-6 space-y-4">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    Structural Feedback
                                </p>

                                {analysisData ? (
                                    <ul className="space-y-3">
                                        {analysisData.structuralFeedback.map((item, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                                                <span className="text-foreground/30 font-mono text-xs mt-0.5 flex-shrink-0">
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : isLoading && matchResult ? (
                                    <div className="flex items-center gap-3 py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Analyzing structure…
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3 py-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex gap-3">
                                                <span className="text-muted-foreground/15 font-mono text-xs">
                                                    {String(i).padStart(2, "0")}
                                                </span>
                                                <div className="h-3 bg-border/15 rounded w-full" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Panel 3 — Hiring Signal Strength */}
                            <div className="analysis-panel rounded-xl border border-border/40 bg-card p-6 space-y-4">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    Hiring Signal Strength
                                </p>

                                {analysisData ? (
                                    <div className="space-y-4">
                                        {analysisData.signals.map((signal, i) => (
                                            <div key={signal.label} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-foreground/80">
                                                        {signal.label}
                                                    </span>
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {signal.value}%
                                                    </span>
                                                </div>
                                                <ProgressBar value={signal.value} delay={i * 100} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-4 py-1">
                                        {["Impact", "Clarity", "Keyword Match", "Role Alignment"].map(
                                            (label) => (
                                                <div key={label} className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-medium text-foreground/20">
                                                            {label}
                                                        </span>
                                                        <span className="text-xs font-mono text-muted-foreground/20">
                                                            —
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-border/15 rounded-full" />
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Panel 4 — Priority Focus */}
                            <div className="analysis-panel rounded-xl border border-border/40 bg-card p-6 space-y-3">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    Priority Focus
                                </p>

                                {analysisData ? (
                                    <div className="border border-border/30 rounded-lg p-4 bg-secondary/20">
                                        <p className="text-sm text-foreground/90 leading-relaxed">
                                            {analysisData.recommendation}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-border/15 rounded-lg p-4">
                                        <div className="h-3 bg-border/10 rounded w-3/4 mb-2" />
                                        <div className="h-3 bg-border/10 rounded w-1/2" />
                                    </div>
                                )}
                            </div>

                            {/* Roast Action Items (bonus) */}
                            {roastResult?.action_items && roastResult.action_items.length > 1 && (
                                <div className="analysis-panel rounded-xl border border-border/40 bg-card p-6 space-y-4">
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                        Action Items
                                    </p>
                                    <ul className="space-y-2.5">
                                        {roastResult.action_items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex gap-3 text-sm text-muted-foreground leading-relaxed"
                                            >
                                                <span className="text-accent font-mono text-xs mt-0.5 flex-shrink-0">
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
