import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreditContext } from "@/contexts/CreditContext";
import {
    apiListResumes,
    apiUploadResume,
    apiStartInterview,
    apiSubmitAnswer,
    apiEndInterview,
    apiGetActiveInterviewSession,
    type ResumeListItem,
    type InterviewQuestion,
    type AnswerEvaluation,
    type InterviewReport,
} from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { FeatureCostTag, InsufficientCreditsWarning } from "@/components/ui/CreditDisplay";
import { HinglishToggle } from "@/components/ui/HinglishToggle";
import {
    ArrowLeft, Loader2, Upload, ChevronRight, Code2, BookOpen, ListChecks,
    Trophy, RotateCcw, FileText, Zap, AlertTriangle,
    Bot, User, ChevronDown, Lightbulb,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EXPERIENCE_LEVELS = ["Fresher (0–1 yr)", "Junior (1–3 yrs)", "Mid (3–6 yrs)", "Senior (6+ yrs)"];

const POPULAR_ROLES = [
    "Software Engineer", "Frontend Developer", "Backend Developer",
    "Full Stack Developer", "Data Scientist", "ML Engineer",
    "DevOps Engineer", "Product Manager", "Data Analyst",
    "iOS Developer", "Android Developer", "Cloud Engineer",
];

function scoreColor(score: number) {
    if (score >= 8) return "text-emerald-400";
    if (score >= 5) return "text-amber-400";
    return "text-red-400";
}

function scoreBg(score: number) {
    if (score >= 8) return "bg-emerald-400/10 border-emerald-400/20";
    if (score >= 5) return "bg-amber-400/10 border-amber-400/20";
    return "bg-red-400/10 border-red-400/20";
}

function qualColor(qual?: string) {
    const q = qual?.toLowerCase() || "";
    if (q === "excellent") return "text-emerald-400";
    if (q === "very good") return "text-emerald-300";
    if (q === "good") return "text-blue-400";
    if (q === "decent") return "text-amber-400";
    return "text-red-400";
}

function TypeBadge({ type }: { type: string }) {
    const cfg =
        type === "theory" ? { icon: BookOpen, label: "Theory", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" } :
            type === "mcq" ? { icon: ListChecks, label: "MCQ", cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" } :
                { icon: Code2, label: "Code", cls: "text-teal-400 bg-teal-400/10 border-teal-400/20" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

// ── Step 1: Setup ─────────────────────────────────────────────────────────────

function SetupStep({
    onStart,
    isRoastMode,
    roastLanguage,
    canAfford,
}: {
    onStart: (resumeId: string, role: string, level: string) => Promise<void>;
    isRoastMode: boolean;
    roastLanguage: string;
    canAfford: boolean;
}) {
    const [resumes, setResumes] = useState<ResumeListItem[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedResume, setSelectedResume] = useState<string>("");
    const [role, setRole] = useState("");
    const [level, setLevel] = useState(EXPERIENCE_LEVELS[0]);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        apiListResumes()
            .then((r) => {
                setResumes(r);
                if (r.length > 0) setSelectedResume(r[0].id);
            })
            .catch(() => setError("Failed to load resumes."))
            .finally(() => setLoadingResumes(false));
    }, []);

    async function handleUpload(f: File) {
        setUploading(true);
        setError("");
        try {
            const res = await apiUploadResume(f);
            const refreshed = await apiListResumes();
            setResumes(refreshed);
            setSelectedResume(res.id);
        } catch (e: unknown) {
            setError(friendlyError(e, "Upload failed."));
        } finally {
            setUploading(false);
        }
    }

    async function handleStart() {
        if (!selectedResume) { setError("Please select or upload a resume."); return; }
        if (!role.trim()) { setError("Please enter the target role."); return; }
        setError("");
        setStarting(true);
        try {
            await onStart(selectedResume, role.trim(), level);
        } catch (e: unknown) {
            setError(friendlyError(e, "Failed to start interview."));
            setStarting(false);
        }
    }

    function resumeLabel(r: ResumeListItem) {
        const parts = r.file_url.split("/");
        return parts[parts.length - 1].replace(/^\d+_/, "");
    }

    return (
        <div className="flex-1 overflow-y-auto"><div className="flex flex-col items-center py-8 px-6 md:px-12 min-h-full">
            <div className="w-full max-w-2xl space-y-8">

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
                        <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Mock Interview</h1>
                    <p className="text-muted-foreground/70 text-sm leading-relaxed max-w-md mx-auto">
                        Get 6 tailored questions — Theory, MCQ, and Code — based on your resume and target role.
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-6 md:p-8 space-y-6">

                    {/* Resume Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Resume
                        </label>
                        {loadingResumes ? (
                            <div className="flex items-center gap-2 py-2 text-muted-foreground/50 text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading resumes…
                            </div>
                        ) : resumes.length > 0 ? (
                            <div className="space-y-2">
                                {resumes.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedResume(r.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${selectedResume === r.id
                                            ? "border-primary/50 bg-primary/5"
                                            : "border-border/30 hover:border-border/50 hover:bg-secondary/20"
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedResume === r.id ? "border-primary" : "border-border/50"}`}>
                                            {selectedResume === r.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                                        </div>
                                        <FileText className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                                        <span className="text-sm font-medium text-foreground/80 truncate">{resumeLabel(r)}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground/50 py-1">
                                No resumes yet. Upload one below.
                            </p>
                        )}

                        {/* Upload new */}
                        <label className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all ${uploading ? "opacity-60 cursor-not-allowed" : "border-border/40 hover:border-border/60 hover:bg-secondary/20"}`}>
                            {uploading
                                ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
                                : <Upload className="w-4 h-4 text-muted-foreground/50" />
                            }
                            <span className="text-xs text-muted-foreground/60">{uploading ? "Uploading…" : "Upload a new PDF"}</span>
                            <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                            />
                        </label>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Target Role
                        </label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Software Engineer"
                            className="w-full bg-secondary/20 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {POPULAR_ROLES.map((r) => (
                                <button key={r} onClick={() => setRole(r)}
                                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${role === r ? "border-primary/40 bg-primary/10 text-foreground" : "border-border/25 text-muted-foreground/50 hover:text-muted-foreground hover:border-border/40"}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Experience Level */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                            Experience Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {EXPERIENCE_LEVELS.map((l) => (
                                <button key={l} onClick={() => setLevel(l)}
                                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${level === l ? "border-primary/50 bg-primary/5 text-foreground" : "border-border/30 text-muted-foreground/60 hover:border-border/50 hover:text-foreground"}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Insufficient credits warning */}
                    {!canAfford && (
                        <InsufficientCreditsWarning feature="interview" />
                    )}

                    {/* Start Button */}
                    <button
                        onClick={handleStart}
                        disabled={starting || uploading || loadingResumes || !canAfford}
                        className={`w-full h-12 flex items-center justify-center gap-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
                            isRoastMode
                                ? "bg-red-600 text-white roast-glow"
                                : "bg-primary text-primary-foreground"
                        }`}
                    >
                        {starting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> {isRoastMode ? "Generating Roast Questions…" : "Generating Questions…"}</>
                            : isRoastMode
                                ? <><span className="flame-flicker">🔥</span> Start Roast Interview<FeatureCostTag feature="interview" className="ml-auto" /></>
                                : <><Zap className="w-4 h-4" /> Start Interview<FeatureCostTag feature="interview" className="ml-auto" /></>
                        }
                    </button>

                    <p className="text-xs text-muted-foreground/30 text-center">
                        {isRoastMode
                            ? "6 savage questions · Theory + MCQ + Code · 🔥 Roast mode ON"
                            : "6 questions · Theory + MCQ + Code · ~10–20 min"
                        }
                    </p>
                </div>
            </div>
        </div></div>
    );
}

// ── Step 2: Interview ─────────────────────────────────────────────────────────

function InterviewStep({
    questions,
    onComplete,
}: {
    questions: InterviewQuestion[];
    onComplete: (report: InterviewReport) => void;
}) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answer, setAnswer] = useState("");
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
    const [showEval, setShowEval] = useState(false);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState("");

    const q = questions[currentIdx];
    const isLast = currentIdx === questions.length - 1;
    const progress = ((currentIdx + 1) / questions.length) * 100;
    const [displayQuestion, setDisplayQuestion] = useState(q?.text ?? "");

    // Reset display text when question changes
    useEffect(() => {
        setDisplayQuestion(q?.text ?? "");
    }, [currentIdx, q?.text]);

    if (!q) return null;

    async function handleSubmit(skip = false) {
        setError("");
        setSubmitting(true);
        try {
            const userAnswer = skip ? null : (q.type === "mcq" ? selectedOption : answer.trim() || null);
            const ev = await apiSubmitAnswer(q.id, userAnswer);
            setEvaluation(ev);
            setShowEval(true);
        } catch (e: unknown) {
            setError(friendlyError(e, "Couldn't submit your answer. Please try again."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleNext() {
        if (isLast) {
            setEnding(true);
            try {
                const report = await apiEndInterview();
                onComplete(report);
            } catch (e: unknown) {
                setError(friendlyError(e, "Failed to generate your report. Please try again."));
                setEnding(false);
            }
        } else {
            setCurrentIdx((i) => i + 1);
            setAnswer("");
            setSelectedOption(null);
            setEvaluation(null);
            setShowEval(false);
            setError("");
        }
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Progress bar */}
            <div className="flex-shrink-0 h-1 bg-border/20">
                <div
                    className="h-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Question counter */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/20 bg-background/60">
                <div className="flex items-center gap-2">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i < currentIdx ? "bg-emerald-400/70" : i === currentIdx ? "bg-primary w-5" : "bg-border/40"}`}
                        />
                    ))}
                </div>
                <span className="text-xs font-mono text-muted-foreground/50">
                    {currentIdx + 1} of {questions.length}
                </span>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Question header */}
                    <div className="flex items-start gap-3">
                        <TypeBadge type={q.type} />
                    </div>

                    {/* Question text */}
                    <div className="rounded-xl border border-border/30 bg-card/60 p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <p className="text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">{displayQuestion}</p>
                                {q.context && (
                                    <p className="text-xs text-muted-foreground/60 italic leading-relaxed border-l-2 border-border/30 pl-3">{q.context}</p>
                                )}
                                <HinglishToggle
                                    originalText={q.text}
                                    onConverted={setDisplayQuestion}
                                    label="Hinglish mein samjho"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Answer area */}
                    {!showEval && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground/50" />
                                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Your Answer</span>
                            </div>

                            {q.type === "mcq" && q.options ? (
                                <div className="space-y-2">
                                    {q.options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedOption(opt)}
                                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm transition-all ${selectedOption === opt
                                                ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                                : "border-border/30 text-muted-foreground/70 hover:border-border/50 hover:text-foreground"
                                                }`}
                                        >
                                            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${selectedOption === opt ? "border-primary text-primary" : "border-border/50 text-muted-foreground/40"}`}>
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            ) : q.type === "code" ? (
                                <div className="rounded-xl border border-border/30 overflow-hidden">
                                    <div className="flex items-center h-8 bg-secondary/30 border-b border-border/20 px-3 gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/40" />
                                        <span className="text-xs text-muted-foreground/30 ml-2">Code Editor</span>
                                    </div>
                                    <textarea
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        rows={10}
                                        placeholder="Write your code here…"
                                        className="w-full bg-background/60 text-foreground text-sm font-mono leading-relaxed p-4 resize-y focus:outline-none"
                                        style={{ minHeight: "220px" }}
                                    />
                                </div>
                            ) : (
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    rows={6}
                                    placeholder="Type your answer here…"
                                    className="w-full bg-secondary/20 border border-border/30 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:border-foreground/20 transition-colors leading-relaxed"
                                />
                            )}

                            {error && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive">{error}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={submitting || (q.type === "mcq" && !selectedOption) || (q.type !== "mcq" && !answer.trim())}
                                    className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {submitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
                                        : <><ChevronRight className="w-4 h-4" /> Submit Answer</>
                                    }
                                </button>
                                <button
                                    onClick={() => handleSubmit(true)}
                                    disabled={submitting}
                                    className="h-11 px-4 rounded-xl border border-border/30 text-sm text-muted-foreground/60 hover:text-muted-foreground hover:border-border/50 transition-colors disabled:opacity-40"
                                >
                                    Skip
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Evaluation */}
                    {showEval && evaluation && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
                            {/* Score */}
                            <div className={`rounded-xl border p-5 flex items-center gap-4 ${scoreBg(evaluation.score)}`}>
                                <div className={`text-4xl font-bold font-mono ${scoreColor(evaluation.score)}`}>
                                    {evaluation.score}<span className="text-lg">/10</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">AI Evaluation</p>
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < evaluation.score ? scoreColor(evaluation.score).replace("text-", "bg-") : "bg-border/30"}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Feedback */}
                            <div className="rounded-xl border border-border/30 bg-card/40 p-5 space-y-4">
                                <div>
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Feedback</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{evaluation.feedback}</p>
                                </div>
                                <div className="border-t border-border/20 pt-4">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-400/70" />
                                        <p className="text-xs font-mono uppercase tracking-widest text-amber-400/60">Ideal Answer</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-wrap font-mono bg-secondary/20 rounded-lg p-3">{evaluation.ideal_answer}</p>
                                </div>
                                {q.type === "code" && evaluation.time_complexity && (
                                    <div className="flex gap-3 pt-1">
                                        <span className="text-xs px-2 py-1 rounded-lg bg-blue-400/10 border border-blue-400/15 text-blue-400/80">TC: {evaluation.time_complexity}</span>
                                        {evaluation.space_complexity && <span className="text-xs px-2 py-1 rounded-lg bg-purple-400/10 border border-purple-400/15 text-purple-400/80">SC: {evaluation.space_complexity}</span>}
                                    </div>
                                )}
                            </div>

                            {/* Next */}
                            <button
                                onClick={handleNext}
                                disabled={ending}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                            >
                                {ending
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Report…</>
                                    : isLast
                                        ? <><Trophy className="w-4 h-4" /> View Report</>
                                        : <><ChevronRight className="w-4 h-4" /> Next Question</>
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Step 3: Report ────────────────────────────────────────────────────────────

function ReportStep({
    report,
    onRestart,
}: {
    report: InterviewReport;
    onRestart: () => void;
}) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Overall score */}
                <div className="text-center space-y-4 py-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
                        <Trophy className={`w-9 h-9 ${qualColor(report.qualitative_score)}`} />
                    </div>
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">Overall Score</p>
                        <p className={`text-6xl font-bold font-mono ${scoreColor(report.overall_score)}`}>
                            {report.overall_score.toFixed(1)}
                            <span className="text-2xl text-muted-foreground/40">/10</span>
                        </p>
                        {report.qualitative_score && (
                            <p className={`text-xl font-semibold mt-2 ${qualColor(report.qualitative_score)}`}>
                                {report.qualitative_score}
                            </p>
                        )}
                    </div>
                    {/* Score bar */}
                    <div className="flex gap-1 max-w-xs mx-auto">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`h-2 flex-1 rounded-full ${i < report.overall_score ? scoreColor(report.overall_score).replace("text-", "bg-") : "bg-border/25"}`} />
                        ))}
                    </div>
                </div>

                {/* Quick summary bar */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Questions", value: report.breakdown.length },
                        { label: "Avg Score", value: report.overall_score.toFixed(1) + "/10" },
                        { label: "Grade", value: report.qualitative_score ?? "—" },
                    ].map((m) => (
                        <div key={m.label} className="rounded-xl border border-border/20 bg-card/50 p-4 text-center">
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1">{m.label}</p>
                            <p className="text-lg font-bold text-foreground/80">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Question Breakdown</p>
                    {report.breakdown.map((item, i) => (
                        <div key={i} className="rounded-xl border border-border/20 bg-card/50 overflow-hidden">
                            <button
                                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/20 transition-colors"
                            >
                                <div className="flex-shrink-0">
                                    <TypeBadge type={item.type} />
                                </div>
                                <p className="flex-1 text-sm text-foreground/70 line-clamp-1 text-left">{item.question}</p>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-sm font-bold font-mono ${scoreColor(item.score)}`}>{item.score}/10</span>
                                    <ChevronDown className={`w-4 h-4 text-muted-foreground/40 transition-transform ${expandedIdx === i ? "rotate-180" : ""}`} />
                                </div>
                            </button>

                            {expandedIdx === i && (
                                <div className="border-t border-border/20 p-4 space-y-4 bg-background/40 animate-in slide-in-from-top-1 fade-in duration-200">
                                    <div>
                                        <p className="text-xs font-mono text-muted-foreground/40 uppercase mb-1.5">Question</p>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{item.question}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono text-muted-foreground/40 uppercase mb-1.5">Your Answer</p>
                                        <p className="text-sm text-muted-foreground/70 leading-relaxed bg-secondary/20 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap">
                                            {item.user_answer || <span className="italic opacity-50">No answer provided</span>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono text-muted-foreground/40 uppercase mb-1.5">Feedback</p>
                                        <p className="text-sm text-foreground/70 leading-relaxed">{item.feedback}</p>
                                    </div>
                                    <div className="border-t border-border/15 pt-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Lightbulb className="w-3.5 h-3.5 text-amber-400/60" />
                                            <p className="text-xs font-mono text-amber-400/50 uppercase">Ideal Answer</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground/60 leading-relaxed bg-secondary/20 rounded-lg p-3 font-mono whitespace-pre-wrap">{item.ideal_answer}</p>
                                    </div>
                                    {item.type === "code" && item.tc && (
                                        <div className="flex gap-2">
                                            <span className="text-xs px-2 py-1 rounded-lg bg-blue-400/10 border border-blue-400/15 text-blue-400/70">TC: {item.tc}</span>
                                            {item.sc && <span className="text-xs px-2 py-1 rounded-lg bg-purple-400/10 border border-purple-400/15 text-purple-400/70">SC: {item.sc}</span>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pb-8">
                    <button
                        onClick={onRestart}
                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-secondary border border-border/30 rounded-xl text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Try Again
                    </button>
                    <Link
                        to="/dashboard"
                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ── Page shell ────────────────────────────────────────────────────────────────

type Step = "setup" | "resume-prompt" | "interview" | "report";

export default function AIInterview() {
    const auth = useAuthContext();
    const navigate = useNavigate();
    // Roast mode is disabled — always false
    const isRoastMode = false;
    const roastLanguage = "english";
    const { canUse, deductLocal, refresh: refreshCredits } = useCreditContext();

    // Auth guard
    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    const [step, setStep] = useState<Step>("setup");
    const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
    const [report, setReport] = useState<InterviewReport | null>(null);
    const [resumeChecking, setResumeChecking] = useState(true);
    const [activeSessionMeta, setActiveSessionMeta] = useState<{ role: string | null; answered: number; total: number } | null>(null);

    // On mount: check Redis for an active session via the backend
    useEffect(() => {
        if (!auth.isAuthenticated) return;
        apiGetActiveInterviewSession()
            .then((data) => {
                if (data.active && data.questions && data.questions.length > 0) {
                    setActiveSessionMeta({
                        role: data.role,
                        answered: data.answered_count,
                        total: data.total_questions ?? data.questions.length,
                    });
                    setStep("resume-prompt");
                }
            })
            .catch(() => { /* non-fatal — just go to setup */ })
            .finally(() => setResumeChecking(false));
    }, [auth.isAuthenticated]);

    const handleStart = useCallback(async (resumeId: string, role: string, level: string) => {
        deductLocal("interview");
        try {
            const qs = await apiStartInterview(resumeId, role, level, isRoastMode, roastLanguage);
            setQuestions(qs);
            setStep("interview");
        } finally {
            refreshCredits();
        }
    }, [isRoastMode, roastLanguage, deductLocal, refreshCredits]);

    const handleResumeSession = useCallback(async () => {
        // Fetch the full session from Redis and jump straight into the interview
        try {
            const data = await apiGetActiveInterviewSession();
            if (data.active && data.questions && data.questions.length > 0) {
                setQuestions(data.questions);
                setStep("interview");
            } else {
                setStep("setup");
            }
        } catch {
            setStep("setup");
        }
        setActiveSessionMeta(null);
    }, []);

    const handleComplete = useCallback((r: InterviewReport) => {
        setReport(r);
        setStep("report");
    }, []);

    const handleRestart = useCallback(() => {
        setQuestions([]);
        setReport(null);
        setActiveSessionMeta(null);
        setStep("setup");
    }, []);

    if (auth.isLoading || resumeChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    return (
        <div className="h-screen flex flex-col bg-background text-foreground">

            {/* Top bar */}
            <header
                className="flex-shrink-0 border-b border-border/40 flex items-center px-4 gap-4 bg-background/95 backdrop-blur-sm z-10"
                style={{ height: "52px" }}
            >
                <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <ArrowLeft className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm tracking-tight hidden sm:inline">Dashboard</span>
                </Link>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/30">·</span>
                    <Bot className="w-4 h-4 text-primary/60" />
                    <span className="font-semibold text-foreground/70">AI Mock Interview</span>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {isRoastMode && (
                        <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
                            <span className="flame-flicker">🔥</span> Roast Mode
                        </span>
                    )}
                    {["setup", "interview", "report"].map((s, i) => (
                        <div key={s} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full transition-all ${step === s ? "bg-primary w-4" : ["setup", "interview", "report"].indexOf(step) > i ? "bg-emerald-400/60" : "bg-border/40"}`} />
                        </div>
                    ))}
                </div>
            </header>

            {/* Resume session prompt */}
            {step === "resume-prompt" && (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-card/60 backdrop-blur-sm p-8 space-y-5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                            <Bot className="w-7 h-7 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Resume your interview?</h2>
                            {activeSessionMeta && (
                                <div className="mt-2 space-y-1">
                                    {activeSessionMeta.role && (
                                        <p className="text-sm font-semibold text-foreground/70">{activeSessionMeta.role}</p>
                                    )}
                                    <p className="text-sm text-muted-foreground/60">
                                        {activeSessionMeta.answered} of {activeSessionMeta.total} questions answered
                                    </p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground/40 mt-2 leading-relaxed">
                                Your session is still active in Redis. Continue where you left off.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={handleResumeSession}
                                className="w-full h-11 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                Continue Interview
                            </button>
                            <button
                                onClick={() => { setActiveSessionMeta(null); setStep("setup"); }}
                                className="w-full h-11 flex items-center justify-center gap-2 border border-border/30 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/20 transition-colors"
                            >
                                Start New Interview
                            </button>
                            <button
                                onClick={() => navigate("/interview/history")}
                                className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            >
                                View Past Interviews →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Steps */}
            {step === "setup" && <SetupStep onStart={handleStart} isRoastMode={isRoastMode} roastLanguage={roastLanguage} canAfford={canUse("interview")} />}
            {step === "interview" && questions.length > 0 && (
                <InterviewStep questions={questions} onComplete={handleComplete} />
            )}
            {step === "report" && report && (
                <ReportStep report={report} onRestart={handleRestart} />
            )}
        </div>
    );
}
