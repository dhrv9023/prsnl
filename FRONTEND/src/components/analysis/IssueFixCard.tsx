import { useState } from "react";
import { Check, Copy, ArrowRight, AlertCircle, Sparkles, XCircle } from "lucide-react";

export interface ParsedIssue {
    isStructured: boolean;
    original: string;
    critique: string;
    fix: string;
    raw: string;
}

export function parseIssueString(text: string): ParsedIssue {
    if (!text || typeof text !== "string") {
        return { isStructured: false, original: "", critique: "", fix: "", raw: "" };
    }

    // Support both unicode arrow → and ascii ->
    const parts = text.split(/\s*→\s*|\s*->\s*/);

    if (parts.length >= 3) {
        // Strip leading/trailing quote marks if wrapped
        const clean = (s: string) => s.trim().replace(/^['"`[]|['"`\]]$/g, "").trim();
        return {
            isStructured: true,
            original: clean(parts[0]),
            critique: clean(parts[1]),
            fix: clean(parts.slice(2).join(" → ")),
            raw: text,
        };
    }

    if (parts.length === 2) {
        const clean = (s: string) => s.trim().replace(/^['"`[]|['"`\]]$/g, "").trim();
        return {
            isStructured: true,
            original: clean(parts[0]),
            critique: "",
            fix: clean(parts[1]),
            raw: text,
        };
    }

    return {
        isStructured: false,
        original: "",
        critique: "",
        fix: "",
        raw: text,
    };
}

interface IssueFixCardProps {
    issue: string;
    index?: number;
    priorityLabel?: string;
    onApplyFix?: (fix: string, original: string) => void;
}

export function IssueFixCard({ issue, priorityLabel }: IssueFixCardProps) {
    const [copied, setCopied] = useState(false);
    const parsed = parseIssueString(issue);

    const handleCopy = async () => {
        const textToCopy = parsed.fix || parsed.raw;
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    if (!parsed.isStructured) {
        return (
            <div className="flex gap-2.5 text-xs text-muted-foreground leading-relaxed p-3 rounded-lg bg-card/50 border border-border/20">
                <XCircle className="w-4 h-4 text-red-400/80 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{parsed.raw}</span>
            </div>
        );
    }

    // Clean up fix prefix if it has "Add: " or "Rewrite: "
    const displayFix = parsed.fix.replace(/^(?:Add|Rewrite|Fix):\s*/i, "");

    return (
        <div className="rounded-xl border border-border/30 bg-card/60 overflow-hidden shadow-xs hover:border-border/50 transition-colors">
            {/* Header / Why it fails banner */}
            <div className="px-4 py-2.5 bg-secondary/20 border-b border-border/20 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    {priorityLabel && (
                        <span className="inline-block text-[10px] font-mono uppercase tracking-wider font-bold text-primary mr-2">
                            {priorityLabel}
                        </span>
                    )}
                    <span className="text-xs font-medium text-foreground/90 leading-snug">
                        {parsed.critique || "Weak point identified in this section"}
                    </span>
                </div>
            </div>

            <div className="p-3.5 space-y-3">
                {/* Before: Weak bullet */}
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-red-400/80 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Before (Weak Element)
                    </div>
                    <div className="text-xs text-muted-foreground bg-red-500/5 border border-red-500/15 rounded-lg p-2.5 leading-relaxed font-mono">
                        "{parsed.original}"
                    </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex items-center justify-center -my-1 text-muted-foreground/30">
                    <ArrowRight className="w-3.5 h-3.5 rotate-90 sm:rotate-0" />
                </div>

                {/* After: Recommended Fix */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Suggested Fix (Recruiter Calibrated)
                        </div>
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer border border-emerald-500/20"
                            title="Copy rewrite to clipboard"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Fix</span>
                                </>
                            )}
                        </button>
                    </div>
                    <div className="text-xs text-foreground bg-emerald-500/8 border border-emerald-500/25 rounded-lg p-2.5 leading-relaxed font-mono selection:bg-emerald-500/30">
                        {displayFix}
                    </div>
                </div>
            </div>
        </div>
    );
}
