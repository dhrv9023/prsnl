import { useState, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { apiPostForm, apiPost } from "@/lib/api";
import { Upload, FileText, Loader2, Flame } from "lucide-react";

interface RoastSection {
    score: string;
    feedback: string;
    issues?: string;
    missing_keywords?: string;
}

interface RoastResult {
    overall_feedback: string;
    summary: string;
    sections: Record<string, RoastSection>;
    action_items: string[];
}

export default function ResumeRoast() {
    const [file, setFile] = useState<File | null>(null);
    const [jobDesc, setJobDesc] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<"idle" | "uploading" | "roasting">("idle");
    const [result, setResult] = useState<RoastResult | null>(null);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        if (!file || !jobDesc.trim()) {
            setError("Upload a resume PDF and enter a job description.");
            return;
        }
        setError("");
        setResult(null);
        setIsLoading(true);

        try {
            // Step 1: Upload resume
            setStep("uploading");
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await apiPostForm<{ id: string }>("/resumes/upload", formData);

            // Step 2: Roast
            setStep("roasting");
            const roastRes = await apiPost<RoastResult>(
                `/analysis/${uploadRes.id}/roast`,
                {
                    resume_id: uploadRes.id,
                    job_description: jobDesc,
                }
            );

            setResult(roastRes);
        } catch (e: any) {
            setError(e.message || "Something went wrong");
        } finally {
            setIsLoading(false);
            setStep("idle");
        }
    };

    const feedbackColor = (level: string) => {
        const l = level.toLowerCase();
        if (l === "excellent" || l === "very good") return "text-emerald-400";
        if (l === "good") return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow pt-24 pb-16 px-4">
                <div className="container max-w-3xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                Resume Roast
                            </span>
                        </div>
                        <h1 className="heading-display text-3xl md:text-4xl">
                            Get Brutally Honest Feedback
                        </h1>
                        <p className="text-muted-foreground text-sm max-w-xl">
                            Upload your resume and we'll run it through our AI career coach
                            for a detailed, no-BS critique.
                        </p>
                    </div>

                    {/* Upload Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group cursor-pointer border-2 border-dashed border-border/50 hover:border-foreground/20 rounded-xl p-8 text-center transition-all duration-300"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {file ? (
                            <div className="flex items-center justify-center gap-3 text-foreground">
                                <FileText className="w-5 h-5" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-destructive ml-2"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 group-hover:text-foreground/50 transition-colors" />
                                <p className="text-sm text-muted-foreground">
                                    Click to upload PDF resume
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Job Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            Job Description
                        </label>
                        <textarea
                            value={jobDesc}
                            onChange={(e) => setJobDesc(e.target.value)}
                            rows={6}
                            className="w-full bg-secondary/50 border border-border rounded-lg p-4 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-all"
                            placeholder="Paste the job description here..."
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full h-12 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {step === "uploading"
                                    ? "Uploading resume..."
                                    : "AI is roasting your resume..."}
                            </>
                        ) : (
                            <>
                                <Flame className="w-4 h-4" /> Roast My Resume
                            </>
                        )}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className="space-y-6">
                            {/* Overall */}
                            <div className="rounded-xl border border-border/50 bg-card p-8 space-y-4 dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                        Overall Verdict
                                    </p>
                                    <span
                                        className={`text-sm font-semibold ${feedbackColor(
                                            result.overall_feedback
                                        )}`}
                                    >
                                        {result.overall_feedback}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {result.summary}
                                </p>
                            </div>

                            {/* Section breakdowns */}
                            {Object.entries(result.sections).map(([key, section]) => (
                                <div
                                    key={key}
                                    className="rounded-xl border border-border/50 bg-card p-6 space-y-3 dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.25)]"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-foreground capitalize">
                                            {key.replace(/_/g, " ")}
                                        </h3>
                                        <span
                                            className={`text-xs font-medium ${feedbackColor(
                                                section.score
                                            )}`}
                                        >
                                            {section.score}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {section.feedback}
                                    </p>
                                    {section.issues && (
                                        <div className="pt-2 border-t border-border/30">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Issues
                                            </p>
                                            <p className="text-xs text-muted-foreground/80">
                                                {section.issues}
                                            </p>
                                        </div>
                                    )}
                                    {section.missing_keywords && (
                                        <div className="pt-2 border-t border-border/30">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">
                                                Missing Keywords
                                            </p>
                                            <p className="text-xs text-muted-foreground/80">
                                                {section.missing_keywords}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Action Items */}
                            {result.action_items?.length > 0 && (
                                <div className="rounded-xl border border-border/50 bg-card p-6 space-y-3 dark:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.25)]">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Action Items
                                    </h3>
                                    <ul className="space-y-2">
                                        {result.action_items.map((item, i) => (
                                            <li
                                                key={i}
                                                className="flex gap-3 text-sm text-muted-foreground"
                                            >
                                                <span className="text-accent font-mono text-xs mt-0.5">
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
