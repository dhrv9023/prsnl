import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreditContext } from "@/contexts/CreditContext";
import {
    apiUploadResume,
    apiGetAtsScore,
    apiGetDeepAnalysis,
    apiGetHiringIntel,
    type MatchResult,
    type HiringIntelReport,
    type DeepAnalysisResult,
} from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { HiringIntelPanel } from "@/components/analysis/HiringIntelPanel";
import { DeepAnalysisPanel } from "@/components/analysis/DeepAnalysisPanel";
import { InsufficientCreditsWarning } from "@/components/ui/CreditDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Upload, FileText, Loader2, AlertTriangle,
    Download, Zap, RotateCcw, Eye, Edit3, LogOut,
    PanelLeft, FileSearch, ChartBar, ArrowLeft,
    Maximize, Minimize, Brain, Layers, ChevronDown,
} from "lucide-react";

// ─── Custom Select ────────────────────────────────────────────────────────────

const EXPERIENCE_OPTIONS = [
    { value: "fresher", label: "Fresher (0–1 yr)" },
    { value: "junior",  label: "Junior (1–3 yrs)" },
    { value: "mid",     label: "Mid-Level (3–5 yrs)" },
    { value: "senior",  label: "Senior (5+ yrs)" },
];

function CustomSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = EXPERIENCE_OPTIONS.find(o => o.value === value) ?? EXPERIENCE_OPTIONS[0];

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between bg-secondary/20 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-foreground/20 transition-colors hover:bg-secondary/30"
            >
                <span>{selected.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border/40 bg-popover shadow-lg overflow-hidden">
                    {EXPERIENCE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-secondary/60 ${
                                opt.value === value
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-foreground"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Circular gauge ───────────────────────────────────────────────────────────

function CircularGauge({ score, loading }: { score: number; loading: boolean }) {
    const R = 52;
    const cx = 64;
    const cy = 64;
    const circ = 2 * Math.PI * R;
    const [displayed, setDisplayed] = useState(0);

    useEffect(() => {
        if (score <= 0) { setDisplayed(0); return; }
        const start = performance.now();
        const dur = 900;
        function step(now: number) {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplayed(Math.round(eased * score));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }, [score]);

    const offset = circ - (displayed / 100) * circ;
    const color = score >= 75 ? "#10b981" : score >= 46 ? "#f59e0b" : "#ef4444";
    const label = score >= 90 ? "Excellent" : score >= 75 ? "Strong" : score >= 60 ? "Good" : score >= 46 ? "Fair" : score > 0 ? "Poor" : "";

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width="128" height="128" className="drop-shadow-sm">
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor"
                    strokeWidth="8" className="text-border/20" />
                <circle cx={cx} cy={cy} r={R} fill="none"
                    stroke={loading ? "hsl(var(--muted))" : color}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={loading ? circ : offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s" }}
                />
                {loading ? (
                    <text x={cx} y={cy + 5} textAnchor="middle" className="fill-muted-foreground text-xs font-mono">…</text>
                ) : (
                    <>
                        <text x={cx} y={cy + 2} textAnchor="middle"
                            fill={score > 0 ? color : "hsl(var(--muted-foreground))"}
                            fontSize="22" fontWeight="700" fontFamily="inherit">
                            {score > 0 ? displayed : "—"}
                        </text>
                        {score > 0 && (
                            <text x={cx} y={cy + 16} textAnchor="middle"
                                fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="inherit">
                                / 100
                            </text>
                        )}
                    </>
                )}
            </svg>
            {label && !loading && (
                <span className="text-xs font-semibold tracking-wider uppercase" style={{ color }}>
                    {label}
                </span>
            )}
        </div>
    );
}

// ─── Mobile tab type ──────────────────────────────────────────────────────────
type MobileTab = "controls" | "canvas" | "analysis";

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ResumeAnalysis() {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const { canUse, deductLocal, refresh: refreshCredits } = useCreditContext();

    // ── Auth Gate ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            // ✅ Store current page as redirect destination
            sessionStorage.setItem("redirectAfterLogin", "/resume-analysis");
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    // ── State ─────────────────────────────────────────────────────────────────
    const [file, setFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
    const [jobDesc, setJobDesc] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [mobileTab, setMobileTab] = useState<MobileTab>("controls");
    const [isExpanded, setIsExpanded] = useState(false);

    const [resumeId, setResumeId] = useState<string | null>(null);
    const [atsLoading, setAtsLoading] = useState(false);
    const [match, setMatch] = useState<MatchResult | null>(null);
    const [error, setError] = useState("");

    // ── Hiring Intel state ────────────────────────────────────────────────────
    const [targetRole, setTargetRole] = useState("");
    const [experienceLevel, setExperienceLevel] = useState("mid");
    const [intelLoading, setIntelLoading] = useState(false);
    const [intel, setIntel] = useState<{ report: HiringIntelReport; atsScore: number; targetRole: string; experienceLevel: string } | null>(null);
    const [analysisTab, setAnalysisTab] = useState<"ats" | "deep" | "intel">("ats");

    // ── Deep Analysis state ────────────────────────────────────────────────
    const [deepLoading, setDeepLoading] = useState(false);
    const [deepResult, setDeepResult] = useState<DeepAnalysisResult | null>(null);

    // ── PDF object URL ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!file) { setPdfUrl(null); return; }
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // ── Drag & drop ───────────────────────────────────────────────────────────
    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f?.type === "application/pdf") acceptFile(f);
    }, []);

    function acceptFile(f: File) {
        setFile(f); setMatch(null); setIntel(null); setDeepResult(null);
        setError(""); setResumeId(null); setEditText("");
    }

    // ── Download ──────────────────────────────────────────────────────────────
    function handleDownload() {
        if (!file) return;
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // ── Upload helper ─────────────────────────────────────────────────────────
    async function ensureUploaded(): Promise<string> {
        if (resumeId) return resumeId;
        if (!file) throw new Error("Please upload a resume PDF.");
        const res = await apiUploadResume(file);
        setResumeId(res.id);
        return res.id;
    }

    // ── Action: ATS Score ─────────────────────────────────────────────────────
    async function handleAtsScore() {
        if (!file) { setError("Please upload a resume PDF first."); return; }
        if (!canUse("ats_score")) { setError("Insufficient credits. ATS Score costs 5 credits."); return; }
        setError(""); setAtsLoading(true);
        deductLocal("ats_score");
        try {
            const id = await ensureUploaded();
            // JD is optional — without it, uses rule-based general scoring
            const result = await apiGetAtsScore(id, jobDesc.trim() || undefined);
            setMatch(result);
            setAnalysisTab("ats");
            setMobileTab("analysis");
        } catch (e: unknown) {
            setError(friendlyError(e, "ATS scoring failed."));
        } finally {
            setAtsLoading(false);
            refreshCredits();
        }
    }

    // ── Action: Deep Analysis ──────────────────────────────────────────────
    async function handleDeepAnalysis() {
        if (!file) { setError("Please upload a resume PDF first."); return; }
        if (!canUse("deep_analysis")) { setError("Insufficient credits. Deep Analysis costs 15 credits."); return; }
        setError(""); setDeepLoading(true);
        deductLocal("deep_analysis");
        try {
            const id = await ensureUploaded();
            const result = await apiGetDeepAnalysis(id, jobDesc.trim() || undefined);
            setDeepResult(result);
            setAnalysisTab("deep");
            setMobileTab("analysis");
        } catch (e: unknown) {
            setError(friendlyError(e, "Deep analysis failed."));
        } finally {
            setDeepLoading(false);
            refreshCredits();
        }
    }

    // ── Action: Hiring Intel ──────────────────────────────────────────────────
    async function handleHiringIntel() {
        if (!file) { setError("Please upload a resume PDF first."); return; }
        if (!jobDesc.trim()) { setError("Hiring Intel requires a job description."); return; }
        if (!targetRole.trim()) { setError("Please enter the target role."); return; }
        if (!canUse("hiring_intel")) { setError("Insufficient credits. Hiring Intelligence costs 25 credits."); return; }
        setError(""); setIntelLoading(true);
        deductLocal("hiring_intel");
        try {
            const id = await ensureUploaded();
            const result = await apiGetHiringIntel(id, jobDesc, targetRole.trim(), experienceLevel);
            setIntel({ report: result.report, atsScore: result.ats_score, targetRole: result.target_role, experienceLevel: result.experience_level });
            if (!match) setMatch({ score: result.ats_score, raw_similarity: 0 });
            setAnalysisTab("intel");
            setMobileTab("analysis");
        } catch (e: unknown) {
            setError(friendlyError(e, "Hiring intelligence analysis failed."));
        } finally {
            setIntelLoading(false);
            refreshCredits();
        }
    }

    const isAnything = atsLoading || deepLoading || intelLoading;
    const showAnalysisPanel = atsLoading || deepLoading || intelLoading || !!match || !!deepResult || !!intel;

    // ─── Sidebar ──────────────────────────────────────────────────────────────
    const sidebarContent = (
        <nav className="flex-1 p-3 space-y-1">
            <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest px-2 pb-1">Workspace</p>

            {/* Upload */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 border ${isDragOver
                    ? "border-primary/50 bg-primary/10"
                    : "border-dashed border-border/40 hover:border-border/60 hover:bg-secondary/30"
                    }`}
            >
                <Upload className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                <span className="text-xs text-muted-foreground/70 group-hover:text-muted-foreground transition-colors leading-tight">
                    {file ? "Change PDF" : "Upload Resume"}
                </span>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
            </div>

            {/* Job description */}
            <div className="pt-3 space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest px-2">Job Description</p>
                <textarea
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    rows={5}
                    className="w-full bg-secondary/20 border border-border/30 rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-foreground/20 transition-colors leading-relaxed"
                    placeholder="Paste job description…"
                />
            </div>



            {/* Error */}
            {error && (
                <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive leading-snug">{error}</p>
                </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2">
                <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest px-2">Run Analysis</p>
                <button
                    onClick={handleAtsScore}
                    disabled={isAnything || !canUse("ats_score")}
                    title={!canUse("ats_score") ? "Insufficient credits (need 5)" : undefined}
                    className="w-full h-9 flex items-center gap-2 px-3 bg-secondary border border-border/40 rounded-lg text-xs font-semibold hover:bg-secondary/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {atsLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Scoring…</span></>
                        : <><Zap className="w-3.5 h-3.5" /><span>{match ? "Re-score ATS" : "ATS Score"}</span><span className="ml-auto text-[10px] font-bold text-emerald-700 dark:text-emerald-400 opacity-70">5 cr</span></>
                    }
                </button>
                <button
                    onClick={handleDeepAnalysis}
                    disabled={isAnything || !canUse("deep_analysis")}
                    title={!canUse("deep_analysis") ? "Insufficient credits (need 15)" : undefined}
                    className="w-full h-9 flex items-center gap-2 px-3 bg-secondary border border-border/40 rounded-lg text-xs font-semibold hover:bg-secondary/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {deepLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Analyzing…</span></>
                        : <><Layers className="w-3.5 h-3.5" /><span>{deepResult ? "Re-analyze" : "Deep Analysis"}</span><span className="ml-auto text-[10px] font-bold text-emerald-700 dark:text-emerald-400 opacity-70">15 cr</span></>
                    }
                </button>
            </div>

            <div className="border-t border-border/15 pt-3 space-y-2">
                <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest px-2">Hiring Intel</p>
                <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-secondary/20 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                    placeholder="Target role (e.g. ML Engineer)"
                />
                <CustomSelect value={experienceLevel} onChange={setExperienceLevel} />
                {!canUse("hiring_intel") && (
                    <InsufficientCreditsWarning feature="hiring_intel" />
                )}
                <button
                    onClick={handleHiringIntel}
                    disabled={isAnything || !canUse("hiring_intel")}
                    title={!canUse("hiring_intel") ? "Insufficient credits (need 25)" : undefined}
                    className="w-full h-9 flex items-center gap-2 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {intelLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Analyzing…</span></>
                        : <><Brain className="w-3.5 h-3.5" /><span>{intel ? "Re-run Intel" : "Hiring Intel"}</span><span className="ml-auto text-[10px] font-bold opacity-70">25 cr</span></>
                    }
                </button>
            </div>

            <p className="text-[10px] text-muted-foreground/25 text-center pt-1">
                ATS / Deep — JD optional · Hiring Intel ≈ 30–45s · JD required
            </p>
        </nav>
    );

    // ─── Canvas ───────────────────────────────────────────────────────────────
    const canvasContent = (
        <div className="flex-1 flex flex-col overflow-hidden bg-secondary/5">
            <div className="flex-shrink-0 h-10 border-b border-border/30 flex items-center gap-2 px-4">
                <div className="flex items-center bg-secondary/40 rounded-md p-0.5">
                    <button
                        onClick={() => setViewMode("preview")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button
                        onClick={() => setViewMode("edit")}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${viewMode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <Edit3 className="w-3 h-3" /> Edit Text
                    </button>
                </div>
                {file && (
                    <span className="text-xs text-muted-foreground/40 ml-2 hidden sm:inline">
                        {viewMode === "edit" ? "Edit extracted text · changes are local only" : "Read-only PDF preview"}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-auto flex items-start justify-center p-4 md:p-6">
                {!file ? (
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full max-w-[680px] aspect-[1/1.41] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${isDragOver ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/50 hover:bg-secondary/20"}`}
                    >
                        <div className="w-14 h-14 rounded-2xl border border-border/30 bg-secondary/30 flex items-center justify-center">
                            <FileText className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-foreground/60">Drop your resume PDF here</p>
                            <p className="text-xs text-muted-foreground/40">or click to browse · PDF only</p>
                        </div>
                    </div>
                ) : viewMode === "preview" && pdfUrl ? (
                    <div className="w-full max-w-[760px] shadow-2xl rounded-lg overflow-hidden border border-border/20">
                        <iframe
                            src={pdfUrl}
                            title="Resume Preview"
                            className="w-full"
                            style={{ height: "calc(100vh - 150px)", minHeight: "400px", border: "none" }}
                        />
                    </div>
                ) : (
                    <div className="w-full max-w-[760px]">
                        <div className="bg-background border border-border/30 rounded-lg shadow-xl overflow-hidden">
                            <div className="h-8 border-b border-border/20 flex items-center px-3 gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400/40" />
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/40" />
                                <span className="text-xs text-muted-foreground/30 ml-2">Extracted Text — editable locally</span>
                            </div>
                            <textarea
                                value={editText || "Upload your resume to see extracted text.\n\nYou can edit this text locally — changes are not sent to the server."}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full bg-background text-foreground text-sm leading-relaxed p-4 md:p-8 resize-none focus:outline-none font-mono"
                                style={{ height: "calc(100vh - 180px)", minHeight: "400px" }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // ─── Analysis panel ───────────────────────────────────────────────────────
    const analysisContent = (
        <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab bar */}
            <div className="flex-shrink-0 flex items-center gap-1 px-4 pt-4 pb-0 border-b border-border/20">
                <button
                    onClick={() => setAnalysisTab("ats")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                        analysisTab === "ats"
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                >
                    <ChartBar className="w-3.5 h-3.5" /> ATS Score
                </button>
                <button
                    onClick={() => setAnalysisTab("deep")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                        analysisTab === "deep"
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" /> Deep Analysis
                    {deepLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </button>
                <button
                    onClick={() => setAnalysisTab("intel")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                        analysisTab === "intel"
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                >
                    <Brain className="w-3.5 h-3.5" /> Hiring Intel
                    {intelLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                </button>
                <div className="ml-auto">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors hidden md:block"
                    >
                        {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 md:p-5 space-y-4">
                {analysisTab === "ats" && (
                    <div className="rounded-xl border border-border/30 bg-card p-6 space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    {match?.mode === "general" ? "Resume Quality Score" : "ATS Match Score"}
                                </p>
                                {match?.mode === "general" && (
                                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">No JD provided — general quality assessment</p>
                                )}
                            </div>
                            {match && !atsLoading && (
                                <button onClick={handleAtsScore} disabled={isAnything}
                                    className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-30">
                                    <RotateCcw className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <div className="flex justify-center py-1">
                            <CircularGauge score={match?.score ?? 0} loading={atsLoading} />
                        </div>
                        {match?.warning && <p className="text-xs text-amber-400/70 text-center">{match.warning}</p>}
                        {match?.note && (
                            <p className="text-xs text-muted-foreground/50 text-center leading-relaxed bg-secondary/20 rounded-lg px-3 py-2">
                                {match.note}
                            </p>
                        )}
                        {/* General mode breakdown */}
                        {match?.mode === "general" && match.breakdown && (
                            <div className="space-y-2 pt-1">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40">Score Breakdown</p>
                                {[
                                    { label: "Content Density", value: match.breakdown.content_density, max: 20 },
                                    { label: "Quantification", value: match.breakdown.quantification, max: 20 },
                                    { label: "Action Verbs", value: match.breakdown.action_verbs, max: 20 },
                                    { label: "Section Coverage", value: match.breakdown.section_coverage, max: 20 },
                                    { label: "Contact Info", value: match.breakdown.contact_info, max: 10 },
                                    { label: "Formatting", value: match.breakdown.formatting, max: 10 },
                                ].map((item) => {
                                    const pct = (item.value / item.max) * 100;
                                    const color = pct >= 75 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
                                    return (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-muted-foreground/50">
                                                <span>{item.label}</span>
                                                <span className="font-mono">{item.value}/{item.max}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-secondary/40">
                                                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!match && !atsLoading && (
                            <p className="text-xs text-muted-foreground/35 text-center">
                                Click <span className="text-foreground/30 font-medium">ATS Score</span> to calculate.
                                JD is optional — without it you get a general quality score.
                            </p>
                        )}
                        {/* Loading skeleton while scoring */}
                        {atsLoading && !match && (
                            <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <p className="text-sm text-muted-foreground">Analyzing your resume…</p>
                                    <p className="text-xs text-muted-foreground/40">
                                        {jobDesc.trim() ? "Comparing against job description (3-5 seconds)" : "Evaluating quality signals (1-2 seconds)"}
                                    </p>
                                </div>
                                <div className="space-y-2 pt-2">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="space-y-1">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-2.5 w-24" />
                                                <Skeleton className="h-2.5 w-8" />
                                            </div>
                                            <Skeleton className="h-1.5 w-full rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {analysisTab === "deep" && (
                    deepLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
                            <p className="text-sm text-muted-foreground">Analyzing your resume section by section…</p>
                            <p className="text-xs text-muted-foreground/40">This takes about 20 seconds</p>
                        </div>
                    ) : deepResult ? (
                        <DeepAnalysisPanel result={deepResult} />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Layers className="w-8 h-8 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground/50">Click <span className="font-semibold text-foreground/40">Deep Analysis</span> in the sidebar</p>
                            <p className="text-xs text-muted-foreground/30">JD is optional — adds keyword gap detection if provided</p>
                        </div>
                    )
                )}

                {analysisTab === "intel" && (
                    intelLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Loader2 className="w-7 h-7 animate-spin text-primary/50" />
                            <p className="text-sm text-muted-foreground">Generating hiring intelligence…</p>
                            <p className="text-xs text-muted-foreground/40">This takes 30–45 seconds</p>
                        </div>
                    ) : intel ? (
                        <HiringIntelPanel
                            report={intel.report}
                            targetRole={intel.targetRole}
                            experienceLevel={intel.experienceLevel}
                            atsScore={intel.atsScore}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Brain className="w-8 h-8 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground/50">Fill in the target role and click</p>
                            <p className="text-xs font-semibold text-primary/60">Hiring Intel</p>
                            <p className="text-xs text-muted-foreground/30">to generate your career intelligence report</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 border-b border-border/40 flex items-center px-3 md:px-4 gap-2 md:gap-4 bg-background/95 backdrop-blur-sm z-10" style={{ height: "52px" }}>
                <Link to="/dashboard" className="flex items-center gap-2 min-w-0 md:w-52 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <ArrowLeft className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm tracking-tight truncate">Back to Dashboard</span>
                </Link>

                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
                    {file && (
                        <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-foreground/70 font-medium truncate max-w-xs">{file.name}</span>
                            {resumeId && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-mono">
                                    SAVED
                                </span>
                            )}
                        </>
                    )}
                </div>

                <div className="flex-1 sm:hidden" />

                <div className="flex items-center gap-2">
                    {file && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 h-8 px-2 md:px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Download PDF</span>
                        </button>
                    )}
                    {auth.user && (
                        <button
                            onClick={auth.logout}
                            title="Sign out"
                            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </header>

            {/* ── Mobile Tab Bar ───────────────────────────────────────────── */}
            <div className="flex-shrink-0 md:hidden border-b border-border/40 flex bg-background/95">
                <button
                    onClick={() => setMobileTab("controls")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${mobileTab === "controls" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground/50"}`}
                >
                    <PanelLeft className="w-3.5 h-3.5" /> Controls
                </button>
                <button
                    onClick={() => setMobileTab("canvas")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${mobileTab === "canvas" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground/50"}`}
                >
                    <FileSearch className="w-3.5 h-3.5" /> Resume
                </button>
                {showAnalysisPanel && (
                    <button
                        onClick={() => setMobileTab("analysis")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${mobileTab === "analysis" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground/50"}`}
                    >
                        <ChartBar className="w-3.5 h-3.5" /> Analysis
                    </button>
                )}
            </div>

            {/* ── Desktop layout ───────────────────────────────────────────── */}
            <div className="hidden md:flex flex-1 overflow-hidden">
                <aside className="w-56 flex-shrink-0 border-r border-border/40 flex flex-col bg-background/60">
                    {sidebarContent}
                    {auth.user && (
                        <div className="border-t border-border/30 p-3">
                            <p className="text-xs text-muted-foreground/40 truncate">{auth.user.email}</p>
                        </div>
                    )}
                </aside>

                <main className={`${isExpanded ? "hidden" : showAnalysisPanel ? "w-[45%]" : "flex-1"} flex flex-col overflow-hidden transition-all duration-300`}>
                    {canvasContent}
                </main>

                {showAnalysisPanel && (
                    <aside className={`${isExpanded ? "flex-1" : "w-[55%]"} flex-shrink-0 border-l border-border/40 flex flex-col overflow-hidden bg-background/60 transition-all duration-300 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)]`}>
                        {analysisContent}
                    </aside>
                )}
            </div>

            {/* ── Mobile layout ────────────────────────────────────────────── */}
            <div className="flex md:hidden flex-1 overflow-hidden">
                {mobileTab === "controls" && (
                    <div className="flex-1 flex flex-col overflow-y-auto bg-background/60">
                        {sidebarContent}
                        {auth.user && (
                            <div className="border-t border-border/30 p-3">
                                <p className="text-xs text-muted-foreground/40 truncate">{auth.user.email}</p>
                            </div>
                        )}
                    </div>
                )}
                {mobileTab === "canvas" && (
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {canvasContent}
                    </main>
                )}
                {mobileTab === "analysis" && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-background/60">
                        {analysisContent}
                    </div>
                )}
            </div>
        </div>
    );
}
