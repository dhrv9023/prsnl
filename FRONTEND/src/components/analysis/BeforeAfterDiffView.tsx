import { useState, useMemo } from "react";
import { Copy, Check, Sparkles, Download, ArrowRight, FileText, CheckCircle2, Columns, Split, X, Eye } from "lucide-react";
import type { DeepAnalysisResult } from "@/lib/api";
import { parseIssueString } from "@/components/analysis/IssueFixCard";

interface BeforeAfterDiffViewProps {
    originalText: string;
    deepResult: DeepAnalysisResult | null;
    onApplyToEditor?: (text: string) => void;
    onClose?: () => void;
}

interface ReplacementItem {
    original: string;
    fix: string;
    section: string;
}

export function BeforeAfterDiffView({
    originalText,
    deepResult,
    onApplyToEditor,
    onClose,
}: BeforeAfterDiffViewProps) {
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);
    const [displayMode, setDisplayMode] = useState<"optimized" | "original" | "split">("optimized");

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
                        if (parsed.isStructured && parsed.original && parsed.fix) {
                            list.push({
                                original: parsed.original,
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
                if (parsed.isStructured && parsed.original && parsed.fix) {
                    list.push({
                        original: parsed.original,
                        fix: parsed.fix.replace(/^(?:Add|Rewrite|Fix):\s*/i, ""),
                        section: "priority",
                    });
                }
            }
        }

        return list;
    }, [deepResult]);

    // Build the optimized text by applying rewrites to the original text
    const optimizedText = useMemo(() => {
        if (!originalText) return "";
        let result = originalText;

        for (const rep of replacements) {
            if (!rep.original || !rep.fix) continue;

            // Try exact replace
            if (result.includes(rep.original)) {
                result = result.replace(rep.original, rep.fix);
                continue;
            }

            // Try normalized whitespace replace
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

    const handleCopy = async () => {
        const textToCopy = displayMode === "original" ? originalText : optimizedText;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleApply = () => {
        if (onApplyToEditor && optimizedText) {
            onApplyToEditor(optimizedText);
            setApplied(true);
            setTimeout(() => setApplied(false), 2500);
        }
    };

    const handleDownload = () => {
        const textToDownload = displayMode === "original" ? originalText : optimizedText;
        if (!textToDownload) return;
        const blob = new Blob([textToDownload], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = displayMode === "original" ? "original_resume.txt" : "optimized_resume.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    if (!originalText) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground/70">Resume Text Not Available</p>
                <p className="text-xs text-muted-foreground/50 max-w-sm">
                    Select a resume from the left sidebar or upload a PDF to extract text and view the Before vs After comparison.
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/70 transition-colors"
                    >
                        Back to PDF Preview
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background/50 rounded-xl border border-border/30 shadow-xl">
            {/* Top Toolbar */}
            <div className="h-12 border-b border-border/20 px-3 md:px-4 flex items-center justify-between gap-2 flex-shrink-0 bg-card/70 backdrop-blur-xs">
                {/* Left: View Mode Toggle */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center bg-secondary/40 rounded-lg p-0.5 border border-border/20">
                        <button
                            type="button"
                            onClick={() => setDisplayMode("optimized")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                displayMode === "optimized"
                                    ? "bg-emerald-500/15 text-emerald-400 font-semibold shadow-xs border border-emerald-500/20"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            <span>With AI Fixes</span>
                            <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-bold ml-0.5">
                                {replacements.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("original")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                displayMode === "original"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <span>Original</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayMode("split")}
                            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                                displayMode === "split"
                                    ? "bg-background text-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Columns className="w-3 h-3" />
                            <span>Side-by-Side</span>
                        </button>
                    </div>
                </div>

                {/* Right: Actions & Close Button */}
                <div className="flex items-center gap-1.5">
                    {onApplyToEditor && (
                        <button
                            type="button"
                            onClick={handleApply}
                            className="h-7.5 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-colors"
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

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="h-7.5 px-2.5 flex items-center gap-1 rounded-md text-xs font-medium bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground"
                        title="Copy text to clipboard"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="hidden sm:inline">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3 h-3" />
                                <span className="hidden sm:inline">Copy</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        className="h-7.5 w-7.5 flex items-center justify-center rounded-md text-xs bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground"
                        title="Download text file"
                    >
                        <Download className="w-3 h-3" />
                    </button>

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

            {/* Resume Document Canvas */}
            <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center bg-secondary/5">
                {displayMode === "split" ? (
                    /* Side-by-Side Document Comparison */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-5xl h-full min-h-[500px]">
                        {/* Original Resume Paper */}
                        <div className="flex flex-col rounded-xl border border-border/30 bg-card shadow-md overflow-hidden">
                            <div className="px-4 py-2.5 bg-secondary/30 border-b border-border/20 flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-mono">
                                    Original Resume
                                </span>
                                <span className="text-[10px] text-red-400/80 font-mono">
                                    {replacements.length} weak points identified
                                </span>
                            </div>
                            <div className="flex-1 p-5 md:p-6 overflow-auto whitespace-pre-wrap leading-relaxed text-xs text-foreground/80 font-sans select-text">
                                {originalText}
                            </div>
                        </div>

                        {/* Optimized Resume Paper */}
                        <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-card shadow-md overflow-hidden">
                            <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                                        With AI Fixes Applied
                                    </span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                                    ✓ Quantified & Calibrated
                                </span>
                            </div>
                            <div className="flex-1 p-5 md:p-6 overflow-auto whitespace-pre-wrap leading-relaxed text-xs text-foreground font-sans select-text selection:bg-emerald-500/30">
                                {optimizedText}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Single Formatted Resume Paper */
                    <div className="w-full max-w-[740px]">
                        <div className={`rounded-xl border shadow-xl bg-card overflow-hidden transition-all ${
                            displayMode === "optimized" ? "border-emerald-500/30 ring-1 ring-emerald-500/15" : "border-border/40"
                        }`}>
                            {/* Document Header Banner */}
                            <div className={`px-5 py-3 border-b flex items-center justify-between transition-colors ${
                                displayMode === "optimized" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-secondary/30 border-border/20"
                            }`}>
                                <div className="flex items-center gap-2">
                                    {displayMode === "optimized" ? (
                                        <>
                                            <Sparkles className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs font-bold text-emerald-400">
                                                Resume Preview: With AI Improvements Applied
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-xs font-bold text-foreground">
                                                Resume Preview: Original Content
                                            </span>
                                        </>
                                    )}
                                </div>
                                <span className="text-[11px] font-mono text-muted-foreground/70">
                                    {displayMode === "optimized" ? `${replacements.length} Fixes Incorporated` : "Unmodified"}
                                </span>
                            </div>

                            {/* Resume Paper Body */}
                            <div className="p-6 md:p-10 whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans select-text">
                                {displayMode === "optimized" ? optimizedText : originalText}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
