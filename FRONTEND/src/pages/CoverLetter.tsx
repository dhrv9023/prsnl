import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreditContext } from "@/contexts/CreditContext";
import { Navbar } from "@/components/layout/Navbar";
import { FeatureCostTag, InsufficientCreditsWarning } from "@/components/ui/CreditDisplay";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    PenTool,
    Save,
    Sparkles,
    Upload,
} from "lucide-react";
import {
    apiGenerateCoverLetter,
    apiGenerateRoastCoverLetter,
    apiHumanizeCoverLetter,
    apiListResumes,
    apiSaveCoverLetterPdf,
    apiUploadResume,
    type ResumeListItem,
} from "@/lib/api";
import { friendlyError } from "@/lib/errors";

const roleExamples = [
    "Frontend Developer",
    "Backend Engineer",
    "Full Stack Developer",
    "Data Analyst",
    "Product Manager",
    "ML Engineer",
];

function resumeName(fileUrl: string) {
    const parts = fileUrl.split("/");
    return (parts[parts.length - 1] || "Resume.pdf").replace(/^\d+_/, "");
}

export default function CoverLetter() {
    const auth = useAuthContext();
    const navigate = useNavigate();
    const { canUse, deductLocal, refresh: refreshCredits } = useCreditContext();

    // Roast mode is disabled — always false
    const isRoastMode = false;
    const roastLanguage = "english";

    const [resumes, setResumes] = useState<ResumeListItem[]>([]);
    const [selectedResume, setSelectedResume] = useState("");
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [humanizing, setHumanizing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [letter, setLetter] = useState("");
    const [applicationId, setApplicationId] = useState("");
    const [savedPdfPath, setSavedPdfPath] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!auth.isLoading && !auth.isAuthenticated) {
            navigate("/", { replace: true });
        }
    }, [auth.isLoading, auth.isAuthenticated, navigate]);

    useEffect(() => {
        if (!auth.isAuthenticated) return;
        setLoadingResumes(true);
        apiListResumes()
            .then((items) => {
                setResumes(items);
                if (items[0]?.id) setSelectedResume(items[0].id);
            })
            .catch((e) => setError(friendlyError(e, "Failed to load resumes.")))
            .finally(() => setLoadingResumes(false));
    }, [auth.isAuthenticated]);

    const canGenerate = useMemo(() => {
        return Boolean(selectedResume && companyName.trim() && jobTitle.trim() && jobDescription.trim());
    }, [selectedResume, companyName, jobTitle, jobDescription]);

    async function handleUpload(file: File) {
        setUploading(true);
        setError("");
        setNotice("");
        try {
            const uploaded = await apiUploadResume(file);
            const refreshed = await apiListResumes();
            setResumes(refreshed);
            setSelectedResume(uploaded.id);
            setNotice("Resume uploaded and selected.");
        } catch (e: unknown) {
            setError(friendlyError(e, "Resume upload failed."));
        } finally {
            setUploading(false);
        }
    }

    async function handleGenerate() {
        if (!canGenerate) {
            setError("Select a resume and fill company, role, and job description.");
            return;
        }
        if (!canUse("cover_letter")) {
            setError("Insufficient credits. Cover Letter Generator costs 10 credits.");
            return;
        }
        setGenerating(true);
        setError("");
        setNotice("");
        setSavedPdfPath("");
        deductLocal("cover_letter");
        try {
            const result = isRoastMode
                ? await apiGenerateRoastCoverLetter(
                    selectedResume,
                    jobDescription.trim(),
                    companyName.trim(),
                    jobTitle.trim(),
                    roastLanguage
                  )
                : await apiGenerateCoverLetter(
                    selectedResume,
                    jobDescription.trim(),
                    companyName.trim(),
                    jobTitle.trim()
                  );
            setApplicationId(result.application_id);
            setLetter(result.content);
            setNotice(isRoastMode ? "🔥 Roast cover letter generated! Edit it before saving." : "Cover letter generated. You can edit it before saving.");
        } catch (e: unknown) {
            setError(friendlyError(e, "Cover letter generation failed."));
        } finally {
            setGenerating(false);
            refreshCredits();
        }
    }

    const handleHumanize = async () => {
        if (!letter.trim()) return;
        if (!canUse("humanize")) {
            setError("Insufficient credits. Humanize costs 15 credits.");
            return;
        }
        setHumanizing(true);
        setError("");
        setNotice("");
        deductLocal("humanize");
        try {
            const { humanized_text } = await apiHumanizeCoverLetter(letter);
            setLetter(humanized_text);
            setNotice("Cover letter humanized successfully.");
            setTimeout(() => setNotice(""), 3000);
        } catch (e: unknown) {
            setError(friendlyError(e, "Failed to humanize cover letter."));
        } finally {
            setHumanizing(false);
            refreshCredits();
        }
    };

    async function handleSavePdf() {
        if (!applicationId || !letter.trim()) {
            setError("Generate a cover letter before saving PDF.");
            return;
        }
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const result = await apiSaveCoverLetterPdf(applicationId, letter.trim());
            setSavedPdfPath(result.pdf_url);
            setNotice("PDF saved to Supabase storage.");
        } catch (e: unknown) {
            setError(friendlyError(e, "Failed to save PDF."));
        } finally {
            setSaving(false);
        }
    }

    function handleDownloadText() {
        if (!letter.trim()) return;
        const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const safeCompany = companyName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "company";
        anchor.href = url;
        anchor.download = `${safeCompany}-cover-letter.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!auth.isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="pt-24 pb-16">
                <div className="container max-w-7xl">
                    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <Link
                                to="/dashboard"
                                className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Dashboard
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                                    <PenTool className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {isRoastMode ? "🔥 Roast Cover Letter" : "Cover Letter Generator"}
                                </h1>
                                <p className="text-sm text-muted-foreground/70">
                                    {isRoastMode
                                        ? "Savage, self-aware cover letters that make hiring managers laugh."
                                        : "Generate, edit, and save a role-specific cover letter from your resume."
                                    }
                                </p>
                            </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {notice && (
                        <div className="mb-5 flex items-start gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                            <p className="text-sm text-emerald-200">{notice}</p>
                        </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                        <aside className="space-y-4">
                            <section className="rounded-lg border border-border/25 bg-card/60 p-5">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Resume</p>
                                <div className="mt-4 space-y-2">
                                    {loadingResumes ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading resumes...
                                        </div>
                                    ) : resumes.length > 0 ? (
                                        resumes.map((resume) => (
                                            <button
                                                key={resume.id}
                                                onClick={() => setSelectedResume(resume.id)}
                                                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${selectedResume === resume.id
                                                    ? "border-primary/50 bg-primary/10"
                                                    : "border-border/25 bg-secondary/10 hover:bg-secondary/20"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                                    <span className="truncate text-sm font-medium">{resumeName(resume.file_url)}</span>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground/70">Upload a resume PDF to begin.</p>
                                    )}

                                    <label className={`mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border/40 text-sm text-muted-foreground hover:bg-secondary/20 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        {uploading ? "Uploading..." : "Upload PDF"}
                                        <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            className="hidden"
                                            disabled={uploading}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleUpload(file);
                                                e.currentTarget.value = "";
                                            }}
                                        />
                                    </label>
                                </div>
                            </section>

                            <section className="rounded-lg border border-border/25 bg-card/60 p-5 space-y-4">
                                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Job Details</p>
                                <div className="space-y-3">
                                    <input
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Company name"
                                        className="w-full rounded-lg border border-border/30 bg-secondary/20 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                                    />
                                    <input
                                        value={jobTitle}
                                        onChange={(e) => setJobTitle(e.target.value)}
                                        placeholder="Job title"
                                        className="w-full rounded-lg border border-border/30 bg-secondary/20 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                                    />
                                    <div className="flex flex-wrap gap-1.5">
                                        {roleExamples.map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => setJobTitle(role)}
                                                className="rounded-md border border-border/25 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/25"
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={jobDescription}
                                        onChange={(e) => setJobDescription(e.target.value)}
                                        placeholder="Paste the job description here"
                                        rows={10}
                                        className="w-full resize-none rounded-lg border border-border/30 bg-secondary/20 px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/40"
                                    />
                                </div>

                                {!canUse("cover_letter") && (
                                    <InsufficientCreditsWarning feature="cover_letter" />
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={!canGenerate || generating || !canUse("cover_letter")}
                                    className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 ${
                                        isRoastMode
                                            ? "bg-red-600 text-white roast-glow"
                                            : "bg-primary text-primary-foreground"
                                    }`}
                                >
                                    {generating
                                        ? <><Loader2 className="h-4 w-4 animate-spin" />{isRoastMode ? "Roasting..." : "Generating..."}</>
                                        : isRoastMode
                                            ? <><span className="flame-flicker">🔥</span>{letter ? "Re-Roast" : "Roast My Letter"}<FeatureCostTag feature="cover_letter" className="ml-auto" /></>
                                            : <><PenTool className="h-4 w-4" />Generate Cover Letter<FeatureCostTag feature="cover_letter" className="ml-auto" /></>
                                    }
                                </button>
                            </section>
                        </aside>

                        <section className="rounded-lg border border-border/25 bg-card/60 overflow-hidden">
                            <div className="flex flex-col gap-3 border-b border-border/15 px-5 py-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/50">Draft</p>
                                    <h2 className="text-lg font-semibold">Editable Cover Letter</h2>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
                                    <button
                                        onClick={handleHumanize}
                                        disabled={!letter.trim() || humanizing || !canUse("humanize")}
                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-medium text-amber-500 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title="Humanize AI tone — costs 15 credits"
                                    >
                                        {humanizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        Humanize AI Tone
                                        <span className="text-[10px] font-bold opacity-60 ml-0.5">15cr</span>
                                    </button>
                                    <button
                                        onClick={handleDownloadText}
                                        disabled={!letter.trim()}
                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border/35 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Download className="h-4 w-4" />
                                        Text
                                    </button>
                                    <button
                                        onClick={handleSavePdf}
                                        disabled={!letter.trim() || !applicationId || saving}
                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Save PDF
                                    </button>
                                </div>
                            </div>

                            <div className="p-5">
                                <textarea
                                    value={letter}
                                    onChange={(e) => setLetter(e.target.value)}
                                    placeholder="Your generated cover letter will appear here."
                                    rows={24}
                                    className="min-h-[560px] w-full resize-none rounded-lg border border-border/25 bg-background/60 px-4 py-4 text-sm leading-7 text-foreground outline-none focus:border-primary/35"
                                />

                                {savedPdfPath && (
                                    <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/8 p-4">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-emerald-300">PDF saved to Supabase Storage</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground/60 truncate">{savedPdfPath}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
