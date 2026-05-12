import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ChevronDown, ChevronUp, Layers, Zap } from "lucide-react";
import type { DeepAnalysisResult, DeepAnalysisSection } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
    title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-border/30 bg-card shadow-sm overflow-hidden">
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors">
                <span className="text-sm font-semibold text-foreground">{title}</span>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
            </button>
            {open && <div className="px-5 pb-5 pt-3 border-t border-border/20 space-y-3">{children}</div>}
        </div>
    );
}

const SCORE_CFG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
    "Excellent": { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: CheckCircle2 },
    "Very Good": { color: "text-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/15", icon: CheckCircle2 },
    "Good":      { color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    icon: CheckCircle2 },
    "Fair":      { color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   icon: AlertTriangle },
    "Poor":      { color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icon: XCircle },
};

function ScorePill({ score }: { score: string }) {
    const cfg = SCORE_CFG[score] ?? SCORE_CFG["Fair"];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {score}
        </span>
    );
}

function OverallBadge({ grade }: { grade: string }) {
    const cfg = SCORE_CFG[grade] ?? SCORE_CFG["Fair"];
    const Icon = cfg.icon;
    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-base font-bold ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            <Icon className="w-4 h-4" />
            {grade}
        </div>
    );
}

function SectionCard({ name, sec }: { name: string; sec: DeepAnalysisSection }) {
    const [open, setOpen] = useState(false);
    const cfg = SCORE_CFG[sec.score] ?? SCORE_CFG["Fair"];
    const hasDetails = (sec.issues?.length ?? 0) > 0 || (sec.missing_keywords?.length ?? 0) > 0;

    return (
        <div className={`rounded-xl border ${cfg.border} bg-card shadow-sm overflow-hidden`}>
            <button onClick={() => setOpen(o => !o)}
                className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-secondary/10 transition-colors text-left">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-foreground capitalize">{name}</p>
                        <ScorePill score={sec.score} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{sec.feedback}</p>
                </div>
                {hasDetails && (
                    <div className="flex-shrink-0 mt-0.5">
                        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/40" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/40" />}
                    </div>
                )}
            </button>

            {open && (
                <div className="border-t border-border/20 px-4 pb-4 pt-3 space-y-3">
                    {/* Full feedback */}
                    <p className="text-xs text-muted-foreground leading-relaxed">{sec.feedback}</p>

                    {/* Issues */}
                    {sec.issues?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-red-400/60 mb-2">Issues</p>
                            <ul className="space-y-1.5">
                                {sec.issues.map((iss, i) => (
                                    <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                                        <XCircle className="w-3.5 h-3.5 text-red-400/70 flex-shrink-0 mt-0.5" />
                                        {iss}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Missing keywords */}
                    {sec.missing_keywords?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-blue-400/60 mb-2">Missing Keywords</p>
                            <div className="flex flex-wrap gap-1.5">
                                {sec.missing_keywords.map((kw, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/15 text-[11px] text-blue-400/80 font-medium">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
    result: DeepAnalysisResult;
}

export function DeepAnalysisPanel({ result }: Props) {
    const sectionEntries = Object.entries(result.sections ?? {});

    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    <span className="text-sm font-bold text-foreground">Deep Resume Analysis</span>
                    {result.jd_provided && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-primary/10 text-primary border-primary/20">
                            JD-Aware
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <OverallBadge grade={result.overall_feedback} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>

            {/* Section breakdown */}
            {sectionEntries.length > 0 && (
                <Section title={`Section Breakdown (${sectionEntries.length})`}>
                    <div className="space-y-2.5">
                        {sectionEntries.map(([name, sec]) => (
                            <SectionCard key={name} name={name} sec={sec} />
                        ))}
                    </div>
                </Section>
            )}

            {/* Action items */}
            {result.action_items?.length > 0 && (
                <Section title="Top Priority Improvements">
                    <ol className="space-y-3">
                        {result.action_items.map((item, i) => (
                            <li key={i} className="flex gap-3 bg-background/50 border border-border/30 rounded-lg p-3.5">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                                    <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </div>
                            </li>
                        ))}
                    </ol>
                </Section>
            )}
        </div>
    );
}
