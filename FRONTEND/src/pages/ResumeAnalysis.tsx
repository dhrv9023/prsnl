import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    apiUploadResume,
    apiGetAtsScore,
    apiGetRoast,
    type MatchResult,
    type RoastDetails,
} from "@/lib/api";
import {
    Upload, FileText, Loader2, BarChart3, AlertTriangle,
    Download, Zap, FlaskConical, RotateCcw, Eye, Edit3,
    CheckCircle2, XCircle, MinusCircle, Info, LogOut,
    PanelLeft, FileSearch, ChartBar, ArrowLeft,
    Maximize, Minimize, Languages,
} from "lucide-react";

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
                {/* Track */}
                <circle cx={cx} cy={cy} r={R} fill="none" stroke="currentColor"
                    strokeWidth="8" className="text-border/20" />
                {/* Progress */}
                <circle cx={cx} cy={cy} r={R} fill="none"
                    stroke={loading ? "hsl(var(--muted))" : color}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={loading ? circ : offset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1), stroke 0.3s" }}
                />
                {/* Center text */}
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
                <span className="text-xs font-semibold tracking-wider uppercase"
                    style={{ color }}>
                    {label}
                </span>
            )}
        </div>
    );
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
    const g = grade.toLowerCase();
    const cfg =
        g.includes("excellent") ? { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" } :
            g.includes("very good") ? { icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-300/10", border: "border-emerald-300/20" } :
                g.includes("good") ? { icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" } :
                    g.includes("fair") ? { icon: MinusCircle, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" } :
                        { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            <Icon className="w-3 h-3" />
            {grade}
        </span>
    );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ name, sec }: { name: string; sec: { score: string; feedback: string; issues?: string; missing_keywords?: string } }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="rounded-lg border border-border/30 bg-secondary/10 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
            >
                <span className="text-sm font-semibold text-foreground/80 capitalize">{name}</span>
                <div className="flex items-center gap-2">
                    {sec.score && <GradeBadge grade={sec.score} />}
                    <span className="text-muted-foreground/40 text-xs">{open ? "▲" : "▼"}</span>
                </div>
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2.5 border-t border-border/20">
                    {sec.feedback && (
                        <p className="text-sm text-muted-foreground leading-relaxed pt-3">{sec.feedback}</p>
                    )}
                    {sec.issues && (
                        <div className="flex gap-2 p-2.5 rounded-md bg-amber-400/5 border border-amber-400/15">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-300/70 leading-relaxed">{sec.issues}</p>
                        </div>
                    )}
                    {sec.missing_keywords && (
                        <div className="flex gap-2 p-2.5 rounded-md bg-blue-400/5 border border-blue-400/15">
                            <Info className="w-3.5 h-3.5 text-blue-400/70 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-300/70 leading-relaxed">
                                <span className="font-medium">Missing keywords: </span>{sec.missing_keywords}
                            </p>
                        </div>
                    )}
                </div>
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

    // ── Auth Gate ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    // ── File & canvas state ───────────────────────────────────────────────────
    const [file, setFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
    const [jobDesc, setJobDesc] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Mobile tab state ──────────────────────────────────────────────────────
    const [mobileTab, setMobileTab] = useState<MobileTab>("controls");

    // ── UI state ──────────────────────────────────────────────────────────────
    const [isExpanded, setIsExpanded] = useState(false);
    const [analysisLanguage, setAnalysisLanguage] = useState<"english" | "hinglish">("english");

    // ── API state ─────────────────────────────────────────────────────────────
    const [resumeId, setResumeId] = useState<string | null>(null);
    const [atsLoading, setAtsLoading] = useState(false);
    const [roastLoading, setRoastLoading] = useState(false);
    const [match, setMatch] = useState<MatchResult | null>(null);
    const [roast, setRoast] = useState<RoastDetails | null>(null);
    const [error, setError] = useState("");

    const isAnything = atsLoading || roastLoading;

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
        setFile(f); setMatch(null); setRoast(null);
        setError(""); setResumeId(null); setEditText("");
    }

    function reset() {
        setFile(null); setPdfUrl(null); setJobDesc("");
        setMatch(null); setRoast(null); setError("");
        setResumeId(null); setEditText(""); setViewMode("preview");
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

    // ── Action 1: ATS Score ───────────────────────────────────────────────────
    async function handleAtsScore() {
        if (!file) { setError("Please upload a resume PDF first."); return; }
        if (!jobDesc.trim()) { setError("Please paste the target job description."); return; }
        setError(""); setAtsLoading(true);
        try {
            const id = await ensureUploaded();
            const result = await apiGetAtsScore(id, jobDesc);
            setMatch(result);
        } catch (e: any) {
            setError(e.message ?? "ATS scoring failed.");
        } finally { setAtsLoading(false); }
    }

    // ── Action 2: Deep Analysis / Roast ──────────────────────────────────────
    async function handleRoast(forceLanguage?: "english" | "hinglish") {
        if (!file) { setError("Please upload a resume PDF first."); return; }
        if (!jobDesc.trim()) { setError("Please paste the target job description."); return; }
        setError(""); setRoastLoading(true);
        const langToUse = forceLanguage || analysisLanguage;
        try {
            const id = await ensureUploaded();
            const result = await apiGetRoast(id, jobDesc, langToUse);
            setRoast(result.roast_details);
            if (!match) setMatch({ score: result.ats_math_score, raw_similarity: 0 });
        } catch (e: any) {
            setError(e.message ?? "Deep analysis failed.");
        } finally { setRoastLoading(false); }
    }

    // ─── Shared UI pieces ─────────────────────────────────────────────────────

    const sidebarContent = (
        <nav className="flex-1 p-3 space-y-1">
            <p className="text-xs font-mono text-muted-foreground/40 uppercase tracking-widest px-2 pb-1">Workspace</p>

            {/* Upload / Re-upload */}
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
                    rows={7}
                    className="w-full bg-secondary/20 border border-border/30 rounded-lg p-2.5 text-xs text-foreground placeholder-muted-foreground/30 resize-none focus:outline-none focus:border-foreground/20 transition-colors leading-relaxed"
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

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
                <button
                    onClick={() => handleAtsScore()}
                    disabled={isAnything}
                    className="w-full h-9 flex items-center justify-center gap-2 bg-secondary border border-border/40 rounded-lg text-xs font-semibold hover:bg-secondary/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {atsLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Scoring…</>
                        : <><Zap className="w-3.5 h-3.5" />{match ? "Re-score ATS" : "ATS Score"}</>
                    }
                </button>
                <button
                    onClick={() => handleRoast()}
                    disabled={isAnything}
                    className="w-full h-9 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {roastLoading
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</>
                        : <><FlaskConical className="w-3.5 h-3.5" />{roast ? "Re-analyze" : "Deep Analysis"}</>
                    }
                </button>
            </div>

            <p className="text-[10px] text-muted-foreground/25 text-center pt-1 leading-relaxed">
                ATS Score = instant · Deep Analysis = ~15–30s
            </p>
        </nav>
    );

    const canvasContent = (
        <div className="flex-1 flex flex-col overflow-hidden bg-secondary/5">
            {/* Canvas toolbar */}
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

            {/* Canvas body */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-4 md:p-6">
                {!file ? (
                    <div
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full max-w-[680px] aspect-[1/1.41] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${isDragOver ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/50 hover:bg-secondary/20"
                            }`}
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
                                value={editText || (roast ? `${roast.summary}\n\n[Upload your resume to see extracted text]` : "Upload your resume then run Deep Analysis to extract text.\n\nYou can edit this text locally — changes are not sent to the server.")}
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

    const analysisContent = (
        <div className="overflow-y-auto flex-1 p-4 md:p-6 space-y-6">

            {/* Panel Header Settings */}
            <div className="flex flex-col gap-3 pb-2 border-b border-border/20">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                        <ChartBar className="w-5 h-5 text-primary" />
                        Analysis Workspace
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* Language Toggle */}
                        <div className="flex items-center bg-secondary/40 rounded-lg p-1 border border-border/40">
                            <button
                                onClick={() => {
                                    setAnalysisLanguage("english");
                                    if (file && jobDesc.trim()) handleRoast("english");
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${analysisLanguage === "english" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                English
                            </button>
                            <button
                                onClick={() => {
                                    setAnalysisLanguage("hinglish");
                                    if (file && jobDesc.trim()) handleRoast("hinglish");
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${analysisLanguage === "hinglish" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Languages className="w-3 h-3" /> Hinglish
                            </button>
                        </div>

                        {/* Expand Toggle */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors hidden md:block border border-transparent hover:border-border/40"
                            title={isExpanded ? "Collapse Analysis" : "Expand Analysis"}
                        >
                            {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ATS Score */}
            <div className="rounded-xl border border-border/30 bg-card p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">ATS Match Score</p>
                    {match && !atsLoading && (
                        <button
                            onClick={() => handleAtsScore()}
                            disabled={isAnything}
                            className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-30"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}
                </div>
                <div className="flex justify-center py-1">
                    <CircularGauge score={match?.score ?? 0} loading={atsLoading} />
                </div>
                {roast?.summary && (
                    <p className="text-xs text-muted-foreground/70 leading-relaxed text-center">{roast.summary}</p>
                )}
                {!match && !atsLoading && (
                    <p className="text-xs text-muted-foreground/35 text-center">
                        Click <span className="text-foreground/30 font-medium">ATS Score</span> to calculate
                    </p>
                )}
            </div>

            {/* Priority Actions */}
            {(roast?.action_items?.length || roastLoading) && (
                <div className="rounded-xl border border-border/30 bg-card p-6 space-y-4 shadow-sm">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Priority Actions</p>
                    {roastLoading ? (
                        <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Generating…</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {roast!.action_items.slice(0, 5).map((item, i) => {
                                const parts = item.split(":");
                                const title = parts.length > 1 ? parts[0] + ":" : "";
                                const desc = parts.length > 1 ? parts.slice(1).join(":") : item;

                                return (
                                    <div key={i} className="flex gap-3 text-sm flex-col sm:flex-row bg-background/50 border border-border/40 rounded-lg p-4 transition-colors hover:bg-background/80">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            {title && <h4 className="font-semibold text-foreground/90">{title}</h4>}
                                            <p className="text-muted-foreground leading-relaxed text-xs sm:text-sm">{desc.trim()}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Structural Feedback */}
            <div className="rounded-xl border border-border/30 bg-card p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Section Analysis</p>
                    {roast && !roastLoading && (
                        <button
                            onClick={() => handleRoast()}
                            disabled={isAnything}
                            className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-30"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {roastLoading ? (
                    <div className="flex items-center gap-2 py-3">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Running deep analysis…</span>
                    </div>
                ) : roast ? (
                    <div className="space-y-2">
                        {Object.entries(roast.sections).map(([key, sec]) => (
                            <SectionCard key={key} name={key} sec={sec} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2.5 py-1">
                        {["Experience", "Projects", "Skills"].map((s) => (
                            <div key={s} className="rounded-lg border border-border/20 px-4 py-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground/30">{s}</span>
                                <span className="w-16 h-2 bg-border/15 rounded-full" />
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground/35 text-center pt-1">
                            Run <span className="text-foreground/30 font-medium">Deep Analysis</span> to unlock
                        </p>
                    </div>
                )}
            </div>

        </div>
    );

    const showAnalysisPanel = !!match || !!roast || atsLoading || roastLoading;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex flex-col dark bg-background text-foreground overflow-hidden">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <header className="flex-shrink-0 border-b border-border/40 flex items-center px-3 md:px-4 gap-2 md:gap-4 bg-background/95 backdrop-blur-sm z-10" style={{ height: "52px" }}>
                {/* Brand */}
                <Link to="/dashboard" className="flex items-center gap-2 min-w-0 md:w-52 hover:opacity-80 transition-opacity">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <ArrowLeft className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm tracking-tight truncate">Back to Dashboard</span>
                </Link>

                {/* File breadcrumb */}
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

                {/* Spacer for mobile */}
                <div className="flex-1 sm:hidden" />

                {/* Actions */}
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

            {/* ── Mobile Tab Bar (visible < md) ────────────────────────────── */}
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

            {/* ── Body ────────────────────────────────────────────────────── */}

            {/* Desktop layout (md and up) */}
            <div className="hidden md:flex flex-1 overflow-hidden">
                {/* Left sidebar — 220px */}
                <aside className="w-56 flex-shrink-0 border-r border-border/40 flex flex-col bg-background/60">
                    {sidebarContent}
                    {/* User info bottom */}
                    {auth.user && (
                        <div className="border-t border-border/30 p-3">
                            <p className="text-xs text-muted-foreground/40 truncate">{auth.user.email}</p>
                        </div>
                    )}
                </aside>

                {/* Center: Resume canvas — 45% (hidden if expanded) */}
                <main className={`${isExpanded ? "hidden" : showAnalysisPanel ? "w-[45%]" : "flex-1"} flex flex-col overflow-hidden transition-all duration-300`}>
                    {canvasContent}
                </main>

                {/* Right panel: Analysis — 55% (or 100% if expanded) */}
                {showAnalysisPanel && (
                    <aside className={`${isExpanded ? "flex-1" : "w-[55%]"} flex-shrink-0 border-l border-border/40 flex flex-col overflow-hidden bg-background/60 transition-all duration-300 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)]`}>
                        {analysisContent}
                    </aside>
                )}
            </div>

            {/* Mobile layout (below md) */}
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
