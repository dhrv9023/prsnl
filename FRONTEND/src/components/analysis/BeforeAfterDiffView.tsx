import { useState, useMemo, useEffect } from "react";
import { Copy, Check, Sparkles, Download, ArrowRight, FileText, CheckCircle2, Columns, X, Eye, Layers, Zap, Loader2, RefreshCw } from "lucide-react";
import type { DeepAnalysisResult } from "@/lib/api";
import { apiGetOptimizedResumePdf } from "@/lib/api";
import { parseIssueString } from "@/components/analysis/IssueFixCard";

interface BeforeAfterDiffViewProps {
    resumeId?: string | null;
    originalText?: string;
    pdfUrl?: string | null;
    deepResult: DeepAnalysisResult | null;
    loading?: boolean;
    optimizedPdfUrl?: string | null;
    isGeneratingOptimizedPdf?: boolean;
    onGenerateOptimizedPdf?: (replacements?: Array<{ original: string; fix: string }>) => Promise<string | null | void>;
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
    resumeId,
    originalText = "",
    pdfUrl,
    deepResult,
    loading = false,
    optimizedPdfUrl: externalOptimizedPdfUrl,
    isGeneratingOptimizedPdf: externalIsGenerating,
    onGenerateOptimizedPdf,
    onApplyToEditor,
    onClose,
    onRunDeepAnalysis,
}: BeforeAfterDiffViewProps) {
    const [copiedAll, setCopiedAll] = useState(false);
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
    const [applied, setApplied] = useState(false);
    const [displayMode, setDisplayMode] = useState<"side_by_side" | "optimized_only" | "original_only" | "fixes">("side_by_side");

    // Local state for optimized PDF if not passed from parent
    const [localOptimizedPdfUrl, setLocalOptimizedPdfUrl] = useState<string | null>(null);
    const [localIsGenerating, setLocalIsGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    const activeOptimizedPdfUrl = externalOptimizedPdfUrl ?? localOptimizedPdfUrl;
    const isGeneratingPdf = externalIsGenerating ?? localIsGenerating;

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

    // Build formatted text replacement string
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

    // Automatically trigger PDF generation when in PDF view mode if not already generated
    const triggerGeneratePdf = async () => {
        if (onGenerateOptimizedPdf) {
            await onGenerateOptimizedPdf(replacements.map(r => ({ original: r.original, fix: r.fix })));
            return;
        }

        if (!resumeId) return;
        setLocalIsGenerating(true);
        setGenError(null);
        try {
            const blob = await apiGetOptimizedResumePdf(
                resumeId,
                replacements.map(r => ({ original: r.original, fix: r.fix }))
            );
            const url = URL.createObjectURL(blob);
            setLocalOptimizedPdfUrl(prev => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        } catch (err: any) {
            setGenError(err.message || "Failed to generate optimized PDF");
        } finally {
            setLocalIsGenerating(false);
        }
    };

    useEffect(() => {
        if (resumeId && !activeOptimizedPdfUrl && !isGeneratingPdf && replacements.length > 0) {
            triggerGeneratePdf();
        }
    }, [resumeId, activeOptimizedPdfUrl, replacements.length]);

    // Cleanup local object URL
    useEffect(() => {
        return () => {
            if (localOptimizedPdfUrl) {
                URL.revokeObjectURL(localOptimizedPdfUrl);
            }
        };
    }, [localOptimizedPdfUrl]);

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

    const handleDownloadOptimizedPdf = () => {
        if (!activeOptimizedPdfUrl) {
            triggerGeneratePdf();
            return;
        }
        const a = document.createElement("a");
        a.href = activeOptimizedPdfUrl;
        a.download = "optimized_resume.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                            onClick={() => setDisplayMode("side_by_side")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "side_by_side"
                                    ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs border border-emerald-500/20"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Columns className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Side-by-Side PDFs</span>
                            {replacements.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold ml-0.5">
                                    {replacements.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("optimized_only")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "optimized_only"
                                    ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs border border-emerald-500/20"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Optimized PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("original_only")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                displayMode === "original_only"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Original PDF</span>
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
                            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Fixes List ({replacements.length})</span>
                        </button>
                    </div>
                </div>

                {/* Right: Actions & Close Button */}
                <div className="flex items-center gap-1.5">
                    {/* Direct Download of the Optimized PDF */}
                    <button
                        type="button"
                        onClick={handleDownloadOptimizedPdf}
                        disabled={isGeneratingPdf}
                        className="h-7.5 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        title="Download ATS-compliant resume PDF with AI fixes applied"
                    >
                        {isGeneratingPdf ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="hidden sm:inline">Generating PDF…</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF</span>
                            </>
                        )}
                    </button>

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
                {displayMode === "side_by_side" ? (
                    /* Side-by-Side: Original PDF on Left, Optimized PDF on Right */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 h-full overflow-hidden">
                        {/* Left: Real Original PDF Viewer */}
                        <div className="flex flex-col rounded-xl border border-border/30 bg-card shadow-md overflow-hidden h-full">
                            <div className="px-4 py-2 bg-secondary/30 border-b border-border/20 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-bold text-foreground tracking-tight">
                                        Your Resume (Original PDF)
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                    Before AI Changes
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
                                        <p className="text-xs text-muted-foreground">Loading Original PDF preview…</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Real Optimized PDF Viewer */}
                        <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-card shadow-md overflow-hidden h-full">
                            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400 tracking-tight">
                                        Optimized Resume (With AI Fixes Applied)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-emerald-400/90 font-semibold">
                                        ATS Compliant · {replacements.length} Fixes
                                    </span>
                                    <button
                                        type="button"
                                        onClick={triggerGeneratePdf}
                                        disabled={isGeneratingPdf}
                                        className="text-[11px] p-1 text-emerald-400/80 hover:text-emerald-400 transition-colors cursor-pointer"
                                        title="Regenerate PDF"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${isGeneratingPdf ? "animate-spin" : ""}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden bg-background/50">
                                {isGeneratingPdf ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                        </div>
                                        <div className="space-y-1 max-w-xs">
                                            <p className="text-sm font-bold text-foreground">Compiling Optimized PDF…</p>
                                            <p className="text-xs text-muted-foreground/75 leading-relaxed">
                                                Applying AI rewrites and formatting your ATS-compliant resume in the background…
                                            </p>
                                        </div>
                                        <div className="w-40 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: "70%" }} />
                                        </div>
                                    </div>
                                ) : activeOptimizedPdfUrl ? (
                                    <iframe
                                        src={activeOptimizedPdfUrl}
                                        title="Optimized Resume PDF (With AI Fixes)"
                                        className="w-full h-full border-none"
                                        style={{ minHeight: "400px" }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                                        <Sparkles className="w-8 h-8 text-emerald-400/50" />
                                        <p className="text-sm font-bold text-foreground">Optimized PDF Not Generated</p>
                                        <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
                                            {genError || "Click below to compile your resume into a clean PDF with all AI improvements applied."}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={triggerGeneratePdf}
                                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-colors cursor-pointer"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Generate Optimized PDF</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : displayMode === "optimized_only" ? (
                    /* Full-width Optimized PDF */
                    <div className="w-full h-full flex flex-col rounded-xl border border-emerald-500/30 bg-card shadow-md overflow-hidden">
                        <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-bold text-emerald-400">
                                    Optimized Resume PDF (With AI Fixes Applied)
                                </span>
                            </div>
                            <span className="text-[10px] text-emerald-400/70 font-mono">
                                ATS-Compliant · Ready for Applications
                            </span>
                        </div>
                        <div className="flex-1 overflow-hidden bg-background/50">
                            {isGeneratingPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                                    <p className="text-xs text-muted-foreground">Compiling Optimized PDF…</p>
                                </div>
                            ) : activeOptimizedPdfUrl ? (
                                <iframe
                                    src={activeOptimizedPdfUrl}
                                    title="Optimized Resume PDF"
                                    className="w-full h-full border-none"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                                    <p className="text-xs text-muted-foreground">No PDF generated yet</p>
                                    <button
                                        type="button"
                                        onClick={triggerGeneratePdf}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold cursor-pointer"
                                    >
                                        Generate Now
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : displayMode === "original_only" ? (
                    /* Full-width Original PDF */
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
                            ) : loading ? (
                                <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-w-xs">
                                        <p className="text-sm font-bold text-foreground">Generating Fixes…</p>
                                        <p className="text-xs text-muted-foreground/75 leading-relaxed">
                                            Reviewing your resume against recruiter benchmarks (≈20s)…
                                        </p>
                                    </div>
                                    <div className="w-40 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{ width: "65%" }} />
                                    </div>
                                </div>
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
