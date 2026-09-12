import { useState, useMemo } from "react";
import { Copy, Check, Sparkles, Download, ArrowRight, FileText, CheckCircle2, Columns, X, Eye, Layers, Zap, Loader2 } from "lucide-react";
import type { DeepAnalysisResult } from "@/lib/api";
import { parseIssueString } from "@/components/analysis/IssueFixCard";

interface BeforeAfterDiffViewProps {
    originalText?: string;
    pdfUrl?: string | null;
    deepResult: DeepAnalysisResult | null;
    onApplyToEditor?: (text: string) => void;
    onClose?: () => void;
    onRunDeepAnalysis?: () => void;
}

interface ReplacementItem {
    original: string;
    critique: string;
    fix: string;
    section: string;
}

export function BeforeAfterDiffView({
    originalText = "",
    pdfUrl,
    deepResult,
    onApplyToEditor,
    onClose,
    onRunDeepAnalysis,
}: BeforeAfterDiffViewProps) {
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [applied, setApplied] = useState(false);
    const [displayMode, setDisplayMode] = useState<"split" | "pdf" | "fixes">("split");

    // Extract all structured fixes from deepResult
    const replacements = useMemo<ReplacementItem[]>(() => {
        if (!deepResult) return [];
        const list: ReplacementItem[] = [];

        // 1. From Section issues
        if (deepResult.sections) {
            for (const [secName, sec] of Object.entries(deepResult.sections)) {
                if (sec.issues) {
                    for (const iss of sec.issues) {
                        const parsed = parseIssueString(iss);
                        if (parsed.isStructured && (parsed.original || parsed.fix)) {
                            list.push({
                                original: parsed.original || "Unspecified bullet in " + secName,
                                critique: parsed.critique,
                                fix: parsed.fix.replace(/^(?:Add|Rewrite|Fix):\s*/i, ""),
                                section: secName,
                            });
                        }
                    }
                }
            }
        }

        // 2. From action items
        if (deepResult.action_items) {
            for (const item of deepResult.action_items) {
                const parsed = parseIssueString(item);
                if (parsed.isStructured && (parsed.original || parsed.fix)) {
                    list.push({
                        original: parsed.original || "Action Item",
                        critique: parsed.critique,
                        fix: parsed.fix.replace(/^(?:Add|Rewrite|Fix):\s*/i, ""),
                        section: "top priority",
                    });
                }
            }
        }

        return list;
    }, [deepResult]);

    // Build the optimized text string for export or editor
    const optimizedText = useMemo(() => {
        if (!originalText) return "";
        let result = originalText;

        for (const rep of replacements) {
            if (!rep.original || !rep.fix) continue;

            if (result.includes(rep.original)) {
                result = result.replace(rep.original, rep.fix);
                continue;
            }

            const normalizedOriginal = rep.original.replace(/\s+/g, " ").trim();
            const normalizedResult = result.replace(/\s+/g, " ");
            if (normalizedResult.includes(normalizedOriginal)) {
                const escaped = rep.original
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .replace(/\s+/g, "\\s+");
                try {
                    const regex = new RegExp(escaped, "i");
                    result = result.replace(regex, rep.fix);
                } catch {
                    // ignore regex failure
                }
            }
        }

        return result;
    }, [originalText, replacements]);

    const handleCopyAll = async () => {
        if (replacements.length === 0) return;
        const textToCopy = replacements
            .map((r, i) => `[${i + 1}] Section: ${r.section.toUpperCase()}\nBEFORE: ${r.original}\nAFTER:  ${r.fix}`)
            .join("\n\n---\n\n");
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleCopySingle = async (text: string, idx: number) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIdx(idx);
            setTimeout(() => setCopiedIdx(null), 2000);
        } catch {
            // fallback
        }
    };

    const handleApply = () => {
        if (onApplyToEditor && (optimizedText || replacements.length > 0)) {
            const targetText = optimizedText || replacements.map(r => `• ${r.fix}`).join("\n");
            onApplyToEditor(targetText);
            setApplied(true);
            setTimeout(() => setApplied(false), 2500);
        }
    };

    const handleDownload = () => {
        const textToDownload = optimizedText || replacements.map(r => `• ${r.fix}`).join("\n");
        if (!textToDownload) return;
        const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "optimized_resume.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background/50 rounded-xl border border-border/30 shadow-xl">
            {/* Top Toolbar */}
            <div className="h-12 border-b border-border/20 px-3 md:px-4 flex items-center justify-between gap-2 flex-shrink-0 bg-card/80 backdrop-blur-xs">
                {/* Left: View Mode Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center bg-secondary/40 rounded-lg p-0.5 border border-border/20">
                        <button
                            type="button"
                            onClick={() => setDisplayMode("split")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "split"
                                    ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs border border-emerald-500/20"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Columns className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Resume PDF + AI Fixes</span>
                            {replacements.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold ml-0.5">
                                    {replacements.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("pdf")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "pdf"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Resume PDF Only</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("fixes")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "fixes"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>AI Fixes ({replacements.length})</span>
                        </button>
                    </div>
                </div>

                {/* Right: Actions & Close Button */}
                <div className="flex items-center gap-1.5">
                    {onApplyToEditor && replacements.length > 0 && (
                        <button
                            type="button"
                            onClick={handleApply}
                            className="h-7.5 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                            title="Insert optimized text into the Edit Text tab"
                        >
                            {applied ? (
                                <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>Applied!</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-3 h-3" />
                                    <span className="hidden sm:inline">Apply to Editor</span>
                                </>
                            )}
                        </button>
                    )}

                    {replacements.length > 0 && (
                        <>
                            <button
                                type="button"
                                onClick={handleCopyAll}
                                className="h-7.5 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground cursor-pointer"
                                title="Copy all fixes to clipboard"
                            >
                                {copiedAll ? (
                                    <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="hidden sm:inline">Copied All!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" />
                                        <span className="hidden sm:inline">Copy All Fixes</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleDownload}
                                className="h-7.5 w-7.5 flex items-center justify-center rounded-md text-xs bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground cursor-pointer"
                                title="Download optimized resume text"
                            >
                                <Download className="w-3 h-3" />
                            </button>
                        </>
                    )}

                    {/* Prominent Dismiss / Close Button */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-7.5 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-300 hover:bg-rose-500/20 transition-colors ml-1 cursor-pointer"
                            title="Hide this comparison and return to the PDF preview"
                        >
                            <X className="w-3.5 h-3.5 text-rose-400" />
                            <span>Close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas Body */}
            <div className="flex-1 overflow-hidden p-3 md:p-4 bg-secondary/5">
                {displayMode === "split" ? (
                    /* Side-by-Side: Real PDF on Left, Before vs After Fixes on Right */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full overflow-hidden">
                        {/* Left: Real PDF Viewer (No Extracted Text!) */}
                        <div className="lg:col-span-7 flex flex-col rounded-xl border border-border/30 bg-card shadow-md overflow-hidden h-full">
                            <div className="px-4 py-2 bg-secondary/30 border-b border-border/20 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-bold text-foreground tracking-tight">
                                        Your Resume (Original PDF)
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                    Exact Visual Document
                                </span>
                            </div>
                            <div className="flex-1 overflow-hidden bg-background/50">
                                {pdfUrl ? (
                                    <iframe
                                        src={pdfUrl}
                                        title="Your Resume PDF"
                                        className="w-full h-full border-none"
                                        style={{ minHeight: "400px" }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                        <p className="text-xs text-muted-foreground">Loading Resume PDF preview…</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: AI Before vs After Fixes */}
                        <div className="lg:col-span-5 flex flex-col rounded-xl border border-emerald-500/30 bg-card shadow-md overflow-hidden h-full">
                            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400">
                                        AI Before vs After Improvements
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400/80">
                                    {replacements.length} Fixes
                                </span>
                            </div>

                            <div className="flex-1 overflow-auto p-3 md:p-4 space-y-3">
                                {replacements.length > 0 ? (
                                    replacements.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-border/30 bg-background/60 p-3.5 space-y-2.5 shadow-xs hover:border-emerald-500/30 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground font-semibold">
                                                    {item.section}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopySingle(item.fix, idx)}
                                                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-secondary/60 hover:bg-secondary text-foreground font-medium transition-colors cursor-pointer"
                                                >
                                                    {copiedIdx === idx ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                            <span className="text-emerald-400">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3 text-muted-foreground" />
                                                            <span>Copy Fix</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Before */}
                                            <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5 space-y-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-rose-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                    <span>Before (In your resume)</span>
                                                </div>
                                                <p className="text-xs text-foreground/80 font-sans leading-relaxed select-text">
                                                    "{item.original}"
                                                </p>
                                            </div>

                                            {/* Critique if present */}
                                            {item.critique && (
                                                <p className="text-[11px] text-muted-foreground/75 italic leading-snug px-1">
                                                    💬 {item.critique}
                                                </p>
                                            )}

                                            {/* After */}
                                            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/25 p-2.5 space-y-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-400">
                                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                                    <span>After (AI Recruiter Rewrite)</span>
                                                </div>
                                                <p className="text-xs text-foreground font-medium font-sans leading-relaxed select-text">
                                                    "{item.fix}"
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <p className="text-sm font-bold text-foreground">No Deep Analysis Fixes Generated Yet</p>
                                        <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
                                            Run Deep Analysis to review your resume against senior recruiter benchmarks and generate tailored Before vs After rewrites.
                                        </p>
                                        {onRunDeepAnalysis && (
                                            <button
                                                type="button"
                                                onClick={onRunDeepAnalysis}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                                            >
                                                <Layers className="w-3.5 h-3.5" />
                                                <span>Run Deep Analysis</span>
                                                <span className="text-[10px] opacity-70 font-mono">15 cr</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : displayMode === "pdf" ? (
                    /* Full-width Real PDF Viewer */
                    <div className="w-full h-full flex flex-col rounded-xl border border-border/30 bg-card shadow-md overflow-hidden">
                        <div className="px-4 py-2 bg-secondary/30 border-b border-border/20 flex items-center justify-between flex-shrink-0">
                            <span className="text-xs font-bold text-foreground">
                                Your Resume (Original PDF)
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 font-mono">
                                Full-Width View
                            </span>
                        </div>
                        <div className="flex-1 overflow-hidden bg-background/50">
                            {pdfUrl ? (
                                <iframe
                                    src={pdfUrl}
                                    title="Your Resume PDF"
                                    className="w-full h-full border-none"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                    <p className="text-xs text-muted-foreground">Loading Resume PDF preview…</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Full-width AI Fixes List */
                    <div className="w-full h-full max-w-4xl mx-auto flex flex-col rounded-xl border border-emerald-500/30 bg-card shadow-md overflow-hidden">
                        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-400">
                                    All AI Before vs After Improvements ({replacements.length})
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
                            {replacements.length > 0 ? (
                                replacements.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="rounded-xl border border-border/30 bg-background/60 p-4 space-y-3 shadow-xs hover:border-emerald-500/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground font-semibold">
                                                {item.section}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopySingle(item.fix, idx)}
                                                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-secondary/60 hover:bg-secondary text-foreground font-medium transition-colors cursor-pointer"
                                            >
                                                {copiedIdx === idx ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-400" />
                                                        <span className="text-emerald-400">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3 text-muted-foreground" />
                                                        <span>Copy Fix</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Before */}
                                            <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-3 space-y-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-rose-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                    <span>Before (In your resume)</span>
                                                </div>
                                                <p className="text-xs text-foreground/80 font-sans leading-relaxed select-text">
                                                    "{item.original}"
                                                </p>
                                            </div>

                                            {/* After */}
                                            <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/25 p-3 space-y-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-wider text-emerald-400">
                                                    <Sparkles className="w-3 h-3 text-emerald-400" />
                                                    <span>After (AI Recruiter Rewrite)</span>
                                                </div>
                                                <p className="text-xs text-foreground font-medium font-sans leading-relaxed select-text">
                                                    "{item.fix}"
                                                </p>
                                            </div>
                                        </div>

                                        {item.critique && (
                                            <p className="text-[11px] text-muted-foreground/80 italic leading-snug px-1 pt-1 border-t border-border/10">
                                                💬 Recruiter critique: {item.critique}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                                    <Sparkles className="w-8 h-8 text-emerald-400/50" />
                                    <p className="text-sm font-bold text-foreground">No Deep Analysis Fixes Available</p>
                                    <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
                                        Run Deep Analysis in the sidebar to review your resume and generate fixes.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
