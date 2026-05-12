import { useState } from "react";
import {
    Brain, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
    XCircle, MinusCircle, TrendingUp, Lightbulb, ArrowRight,
    Shield, Target, Zap, Eye,
} from "lucide-react";
import type { HiringIntelReport } from "@/lib/api";
import { HinglishToggle } from "@/components/ui/HinglishToggle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = true }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-xl border border-border/30 bg-card shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/20 transition-colors"
            >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <Icon className="w-4 h-4 text-primary" />
                    {title}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />}
            </button>
            {open && <div className="px-5 pb-5 space-y-3 border-t border-border/20 pt-4">{children}</div>}
        </div>
    );
}

function Pill({ label, variant }: { label: string; variant: "success" | "warn" | "danger" | "neutral" | "info" }) {
    const styles = {
        success: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
        warn: "bg-amber-400/10 text-amber-400 border-amber-400/20",
        danger: "bg-red-400/10 text-red-400 border-red-400/20",
        neutral: "bg-secondary/60 text-muted-foreground border-border/30",
        info: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[variant]}`}>
            {label}
        </span>
    );
}

function BulletList({ items, variant = "neutral" }: { items: string[]; variant?: "success" | "danger" | "warn" | "neutral" }) {
    const icons = {
        success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />,
        danger: <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />,
        warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />,
        neutral: <MinusCircle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />,
    };
    return (
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    {icons[variant]}
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

function ShortlistBadge({ prob }: { prob: string }) {
    const cfg =
        prob === "High" ? { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", icon: CheckCircle2 } :
            prob === "Medium" ? { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", icon: MinusCircle } :
                { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", icon: XCircle };
    const Icon = cfg.icon;
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border}`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
            <span className={`text-sm font-bold ${cfg.color}`}>{prob} Shortlist Probability</span>
        </div>
    );
}

function ReadinessBadge({ readiness }: { readiness: string }) {
    const map: Record<string, { color: string; bg: string; border: string }> = {
        "Not Ready": { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
        "Borderline": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        "Interview-Ready": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        "Strong Candidate": { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    };
    const cfg = map[readiness] ?? map["Borderline"];
    return (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-base ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {readiness}
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface Props {
    report: HiringIntelReport;
    targetRole: string;
    experienceLevel: string;
    atsScore: number;
}

export function HiringIntelPanel({ report, targetRole, experienceLevel, atsScore }: Props) {
    const [overallText, setOverallText] = useState(report.overall_alignment);
    const [verdictText, setVerdictText] = useState(report.final_verdict.summary);

    return (
        <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold text-foreground">Hiring Intelligence Report</span>
                        <Pill label={targetRole} variant="info" />
                        <Pill label={experienceLevel} variant="neutral" />
                        {atsScore > 0 && <Pill label={`ATS ${atsScore}/100`} variant={atsScore >= 70 ? "success" : atsScore >= 45 ? "warn" : "danger"} />}
                    </div>
                    <HinglishToggle
                        originalText={report.overall_alignment}
                        onConverted={setOverallText}
                        label="Hinglish mein"
                    />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{overallText}</p>
            </div>

            {/* 1. Recruiter POV */}
            <Section title="Recruiter POV" icon={Eye}>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1.5">First Impression</p>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">"{report.recruiter_pov.first_impression}"</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Strong Signals</p>
                            <BulletList items={report.recruiter_pov.strong_signals} variant="success" />
                        </div>
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Recruiter Concerns</p>
                            <BulletList items={report.recruiter_pov.recruiter_concerns} variant="danger" />
                        </div>
                    </div>
                    <div className="border-t border-border/20 pt-3 space-y-2">
                        <ShortlistBadge prob={report.recruiter_pov.verdict.shortlist_probability} />
                        <p className="text-sm text-muted-foreground leading-relaxed">{report.recruiter_pov.verdict.perceived_readiness}</p>
                        <p className="text-xs text-muted-foreground/60 leading-relaxed">{report.recruiter_pov.verdict.competitiveness}</p>
                    </div>
                </div>
            </Section>

            {/* 2. Skill Gap */}
            <Section title="Skill Gap Analysis" icon={Target}>
                <div className="space-y-4">
                    {report.skill_gap.critical_missing.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-red-400/60 mb-2">Critical Missing</p>
                            <div className="space-y-2.5">
                                {report.skill_gap.critical_missing.map((s, i) => (
                                    <div key={i} className="rounded-lg border border-red-400/15 bg-red-400/5 p-3 space-y-1">
                                        <span className="text-sm font-semibold text-red-300">{s.skill}</span>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{s.why_it_matters}</p>
                                        <p className="text-xs text-red-400/70 leading-relaxed">↳ {s.hiring_impact}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {report.skill_gap.optional_missing.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-amber-400/60 mb-2">Optional / Nice-to-Have</p>
                            <div className="space-y-2">
                                {report.skill_gap.optional_missing.map((s, i) => (
                                    <div key={i} className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-3 space-y-1">
                                        <span className="text-sm font-semibold text-amber-300">{s.skill}</span>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{s.why_it_matters}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {report.skill_gap.production_gaps.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Production Gaps</p>
                            <BulletList items={report.skill_gap.production_gaps} variant="warn" />
                        </div>
                    )}
                </div>
            </Section>

            {/* 3. Deep Hiring Analysis */}
            <Section title="Deep Hiring Analysis" icon={Shield}>
                <div className="space-y-3">
                    {(["engineering_maturity", "execution_capability", "project_credibility", "production_readiness"] as const).map((key) => {
                        const labels: Record<string, string> = {
                            engineering_maturity: "Engineering Maturity",
                            execution_capability: "Execution Capability",
                            project_credibility: "Project Credibility",
                            production_readiness: "Production Readiness",
                        };
                        return (
                            <div key={key} className="rounded-lg border border-border/20 bg-secondary/10 p-3 space-y-1">
                                <p className="text-xs font-semibold text-foreground/70">{labels[key]}</p>
                                <p className="text-sm text-muted-foreground leading-relaxed">{report.deep_hiring_analysis[key]}</p>
                            </div>
                        );
                    })}
                </div>
            </Section>

            {/* 4. Role-Aware Reasoning */}
            <Section title="Role-Aware Reasoning" icon={Brain} defaultOpen={false}>
                <div className="space-y-4">
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1.5">What Recruiters Prioritize</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{report.role_aware_reasoning.what_recruiters_prioritize}</p>
                    </div>
                    <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-1.5">Candidate Alignment</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{report.role_aware_reasoning.candidate_alignment}</p>
                    </div>
                    {report.role_aware_reasoning.role_specific_strengths.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Role-Specific Strengths</p>
                            <BulletList items={report.role_aware_reasoning.role_specific_strengths} variant="success" />
                        </div>
                    )}
                    {report.role_aware_reasoning.role_specific_weaknesses.length > 0 && (
                        <div>
                            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50 mb-2">Role-Specific Weaknesses</p>
                            <BulletList items={report.role_aware_reasoning.role_specific_weaknesses} variant="danger" />
                        </div>
                    )}
                </div>
            </Section>

            {/* 5. Why This Matters */}
            {report.why_this_matters.length > 0 && (
                <Section title="Why This Matters" icon={Lightbulb} defaultOpen={false}>
                    <div className="space-y-3">
                        {report.why_this_matters.map((item, i) => (
                            <div key={i} className="rounded-lg border border-border/20 bg-secondary/10 p-3 space-y-1.5">
                                <p className="text-sm font-semibold text-foreground/80">{item.gap}</p>
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* 6. Highest Impact Improvements */}
            {report.highest_impact_improvements.length > 0 && (
                <Section title="Highest Impact Improvements" icon={TrendingUp}>
                    <div className="space-y-3">
                        {report.highest_impact_improvements.map((item, i) => (
                            <div key={i} className="flex gap-3 bg-background/50 border border-border/30 rounded-lg p-4">
                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex-shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-sm font-semibold text-foreground/90">{item.improvement}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.why}</p>
                                    <p className="text-xs text-primary/70 leading-relaxed font-medium">↳ {item.hiring_impact}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* 7. Before / After Rewrites */}
            {report.before_after_rewrites.length > 0 && (
                <Section title="Before vs After Rewrites" icon={Zap} defaultOpen={false}>
                    <div className="space-y-4">
                        {report.before_after_rewrites.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-3">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-red-400/60 mb-1">Before</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.original}</p>
                                </div>
                                <div className="flex justify-center">
                                    <ArrowRight className="w-4 h-4 text-muted-foreground/30 rotate-90" />
                                </div>
                                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/60 mb-1">After</p>
                                    <p className="text-xs text-foreground/80 leading-relaxed font-medium">{item.improved}</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground/50 px-1 leading-relaxed">{item.reason}</p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* 8. Final Verdict */}
            <div className="rounded-xl border border-primary/20 bg-card p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Final Hiring Readiness Verdict</p>
                    <HinglishToggle
                        originalText={report.final_verdict.summary}
                        onConverted={setVerdictText}
                        label="Hinglish"
                    />
                </div>
                <ReadinessBadge readiness={report.final_verdict.hiring_readiness} />
                <p className="text-sm text-muted-foreground leading-relaxed">{verdictText}</p>
            </div>
        </div>
    );
}
