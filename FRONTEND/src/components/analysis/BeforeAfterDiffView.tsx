import { useState, useMemo } from "react";
import { Copy, Check, Sparkles, Download, ArrowRight, FileText, CheckCircle2, Split, Columns } from "lucide-react";
import type { DeepAnalysisResult } from "@/lib/api";
import { parseIssueString, type ParsedIssue } from "@/components/analysis/IssueFixCard";

interface BeforeAfterDiffViewProps {
    originalText: string;
    deepResult: DeepAnalysisResult | null;
    onApplyToEditor?: (text: string) => void;
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
}: BeforeAfterDiffViewProps) {
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);
    const [viewStyle, setViewStyle] = useState<"side-by-side" | "stacked">("side-by-side");

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

            // Try trimmed or normalized whitespace replace
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
        try {
            await navigator.clipboard.writeText(optimizedText);
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
        if (!optimizedText) return;
        const blob = new Blob([optimizedText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "optimized_resume.txt";
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
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background/50 rounded-xl border border-border/30 shadow-xl">
            {/* Top Toolbar */}
            <div className="h-12 border-b border-border/20 px-4 flex items-center justify-between gap-2 flex-shrink-0 bg-card/60">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-foreground">
                        Before vs After Comparison
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        {replacements.length} Fixes Available
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="hidden sm:flex items-center bg-secondary/30 rounded-lg p-0.5 border border-border/20">
                        <button
                            type="button"
                            onClick={() => setViewStyle("side-by-side")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                viewStyle === "side-by-side"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Columns className="w-3 h-3" /> Side by Side
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewStyle("stacked")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                viewStyle === "stacked"
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Split className="w-3 h-3" /> Stacked
                        </button>
                    </div>

                    {/* Actions */}
                    {onApplyToEditor && (
                        <button
                            type="button"
                            onClick={handleApply}
                            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
                            title="Apply all AI rewrites to the local text editor"
                        >
                            {applied ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Applied!</span>
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Apply to Editor</span>
                                </>
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground"
                        title="Copy complete optimized text"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Copy Text</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-xs bg-secondary border border-border/40 hover:bg-secondary/70 transition-colors text-foreground"
                        title="Download optimized text file"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 overflow-auto p-4 md:p-6">
                {viewStyle === "side-by-side" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full min-h-[500px]">
                        {/* Before Column */}
                        <div className="flex flex-col rounded-xl border border-red-500/20 bg-card/40 overflow-hidden shadow-sm">
                            <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-xs font-bold text-red-300 font-mono tracking-wide uppercase">
                                        Before (Original Resume)
                                    </span>
                                </div>
                                <span className="text-[10px] text-muted-foreground/60 font-mono">
                                    Identified {replacements.length} weak areas
                                </span>
                            </div>
                            <div className="flex-1 p-4 font-mono text-xs text-muted-foreground leading-relaxed overflow-auto whitespace-pre-wrap select-text">
                                {originalText}
                            </div>
                        </div>

                        {/* After Column */}
                        <div className="flex flex-col rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-sm">
                            <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-bold text-emerald-300 font-mono tracking-wide uppercase">
                                        After (With AI Rewrites)
                                    </span>
                                </div>
                                <span className="text-[10px] text-emerald-400/80 font-mono font-medium">
                                    ✓ Quantified & Calibrated
                                </span>
                            </div>
                            <div className="flex-1 p-4 font-mono text-xs text-foreground leading-relaxed overflow-auto whitespace-pre-wrap select-text">
                                {optimizedText}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Stacked View */
                    <div className="space-y-4 max-w-4xl mx-auto">
                        <div className="rounded-xl border border-red-500/20 bg-card/40 overflow-hidden">
                            <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="text-xs font-bold text-red-300 font-mono uppercase tracking-wide">
                                    Before (Original Resume)
                                </span>
                            </div>
                            <div className="p-4 font-mono text-xs text-muted-foreground leading-relaxed max-h-[350px] overflow-auto whitespace-pre-wrap select-text">
                                {originalText}
                            </div>
                        </div>

                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
                            <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-xs font-bold text-emerald-300 font-mono uppercase tracking-wide">
                                    After (Optimized with Fixes)
                                </span>
                            </div>
                            <div className="p-4 font-mono text-xs text-foreground leading-relaxed max-h-[350px] overflow-auto whitespace-pre-wrap select-text">
                                {optimizedText}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
