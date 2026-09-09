import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    Mail, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle,
    ArrowLeft, MapPin, Clock, Linkedin, Twitter, Instagram, Github,
    BookOpen, ArrowRight, ExternalLink
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";


export default function Contact() {
    const { user } = useAuthContext();
    const [formData, setFormData] = useState({
        name: "",
        email: user?.email || "",
        category: "general",
        message: "",
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [honeypot, setHoneypot] = useState("");
    const formMountTime = useRef(Date.now());
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Blog posts from standalone blog — uses env variables, zero hardcoded secrets
    const [blogPosts, setBlogPosts] = useState<Array<{
        id: string; title: string; description?: string;
        category: string; category_color: string;
        media_url: string; type: string;
    }>>([]);
    const [blogLoading, setBlogLoading] = useState(true);

    useEffect(() => {
        async function fetchBlogPosts() {
            const blogUrl = import.meta.env.VITE_BLOG_SUPABASE_URL || "https://qifdqnksyodhispfptgj.supabase.co";
            const blogKey = import.meta.env.VITE_BLOG_SUPABASE_ANON_KEY;

            if (!blogKey) {
                // If blog anon key not supplied via env, gracefully stop loading without leaking secrets in git
                setBlogLoading(false);
                return;
            }

            try {
                const res = await fetch(
                    `${blogUrl}/rest/v1/blog_posts?select=id,title,description,category,category_color,media_url,type&order=display_order.asc&limit=3`,
                    {
                        headers: {
                            apikey: blogKey,
                            Authorization: `Bearer ${blogKey}`,
                        }
                    }
                );
                if (res.ok) setBlogPosts(await res.json());
            } catch {
                // silently fail — blog section just won't show
            } finally {
                setBlogLoading(false);
            }
        }
        fetchBlogPosts();
    }, []);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedMessage = formData.message.trim();

        if (trimmedName.length < 2) {
            errors.name = "Name must be at least 2 characters.";
        } else if (trimmedName.length > 80) {
            errors.name = "Name must be under 80 characters.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            errors.email = "Please enter a valid email address.";
        }

        if (trimmedMessage.length < 10) {
            errors.message = "Message must be at least 10 characters.";
        } else if (trimmedMessage.length > 2000) {
            errors.message = "Message must be under 2,000 characters.";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        // ── Spam protection 1: Honeypot trap ─────────────────────────────────
        if (honeypot.trim().length > 0) {
            // Silently pretend success to fool bot scripts
            setStatus("success");
            return;
        }

        // ── Spam protection 2: Superhuman submission speed check ─────────────
        const elapsedMs = Date.now() - formMountTime.current;
        if (elapsedMs < 1500) {
            setStatus("error");
            setErrorMessage("Submission rejected: form filled too quickly. Please take a moment and try again.");
            return;
        }

        // ── Spam protection 3: Client-side hourly submission cap ──────────────
        const SUBMISSION_KEY = "kareerist_contact_history";
        const oneHourAgo = Date.now() - 3600 * 1000;
        let history: number[] = [];
        try {
            const raw = localStorage.getItem(SUBMISSION_KEY);
            if (raw) history = JSON.parse(raw).filter((t: number) => t > oneHourAgo);
        } catch {
            history = [];
        }

        if (history.length >= 3) {
            setStatus("error");
            setErrorMessage("Too many submissions this hour. For urgent questions, please email kareerist2@gmail.com directly.");
            return;
        }

        // ── Client-side form validation ──────────────────────────────────────
        if (!validateForm()) {
            return;
        }

        setStatus("sending");

        const sanitize = (str: string) => str.replace(/<[^>]*>?/gm, "").trim();
        const safeName = sanitize(formData.name);
        const safeMessage = sanitize(formData.message);

        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (!publicKey || !serviceId || !templateId) {
            setStatus("error");
            setErrorMessage("Direct email submission is temporarily unavailable. Please reach us at kareerist2@gmail.com.");
            return;
        }

        try {
            const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: publicKey,
                    template_params: {
                        name: safeName,
                        email: formData.email.trim(),
                        category: formData.category,
                        message: safeMessage,
                    },
                }),
            });

            if (response.ok) {
                history.push(Date.now());
                localStorage.setItem(SUBMISSION_KEY, JSON.stringify(history));
                setStatus("success");
                setFormData({
                    name: "",
                    email: user?.email || "",
                    category: "general",
                    message: "",
                });

                // Reset success message after 5 seconds
                setTimeout(() => setStatus("idle"), 5000);
            } else {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to send email");
            }
        } catch (error) {
            setStatus("error");
            setErrorMessage("Failed to send message. Please try emailing us directly.");
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-16 px-6 md:px-12 border-b border-border/30">
                    <div className="max-w-6xl mx-auto">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Link>

                        <div className="max-w-3xl">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                                Get in Touch
                            </h1>
                            <p className="text-lg text-muted-foreground/80 leading-relaxed">
                                Have questions, feedback, or need support? We're here to help. Reach out to us
                                and we'll get back to you within 24-48 hours.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact Content */}
                <section className="py-16 px-6 md:px-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid lg:grid-cols-3 gap-12">
                            {/* Contact Information */}
                            <div className="lg:col-span-1 space-y-8">
                                {/* Email */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold">Email</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground/70 leading-relaxed">
                                        For general inquiries, support, or feedback
                                    </p>
                                    <a
                                        href="mailto:kareerist2@gmail.com"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
                                    >
                                        kareerist2@gmail.com
                                    </a>
                                </div>



                                {/* Location */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <h3 className="text-lg font-semibold">Location</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground/70 leading-relaxed">
                                        Gurugram, India
                                    </p>
                                </div>

                                {/* Response Time */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <h3 className="text-lg font-semibold">Response Time</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground/70 leading-relaxed">
                                        We aim to respond to all support queries within 24-48 hours.
                                    </p>
                                </div>

                                {/* Social Links */}
                                <div className="pt-6 border-t border-border/30">
                                    <h3 className="text-sm font-semibold mb-4 text-muted-foreground/60">
                                        CONNECT WITH US
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <a
                                            href="https://twitter.com/kareerist5"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/30 flex items-center justify-center transition-colors"
                                            aria-label="Twitter"
                                        >
                                            <Twitter className="w-4 h-4 text-muted-foreground" />
                                        </a>
                                        <a
                                            href="https://instagram.com/kare.erist"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/30 flex items-center justify-center transition-colors"
                                            aria-label="Instagram"
                                        >
                                            <Instagram className="w-4 h-4 text-muted-foreground" />
                                        </a>
                                        <span
                                            className="w-10 h-10 rounded-xl bg-secondary/30 border border-border/20 flex items-center justify-center text-muted-foreground/40 cursor-default"
                                            aria-label="LinkedIn (Coming Soon)"
                                            title="LinkedIn — coming soon"
                                        >
                                            <Linkedin className="w-4 h-4" />
                                        </span>
                                        <span
                                            className="w-10 h-10 rounded-xl bg-secondary/30 border border-border/20 flex items-center justify-center text-muted-foreground/40 cursor-default"
                                            aria-label="GitHub (Coming Soon)"
                                            title="GitHub — coming soon"
                                        >
                                            <Github className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Form */}
                            <div className="lg:col-span-2">
                                <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <MessageSquare className="w-6 h-6 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">Send us a message</h2>
                                            <p className="text-sm text-muted-foreground/60">
                                                Fill out the form below and we'll get back to you soon
                                            </p>
                                        </div>
                                    </div>

                                    {status === "success" && (
                                        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-emerald-500">
                                                    Message sent successfully!
                                                </p>
                                                <p className="text-xs text-emerald-500/70 mt-1">
                                                    We'll get back to you within 24-48 hours.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {status === "error" && (
                                        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-destructive">
                                                    Failed to send message
                                                </p>
                                                <p className="text-xs text-destructive/70 mt-1">
                                                    {errorMessage || "Please try again or email us directly."}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Honeypot field for bot spam protection - hidden from human users */}
                                        <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
                                            <label htmlFor="website_trap">Website</label>
                                            <input
                                                type="text"
                                                id="website_trap"
                                                name="website_trap"
                                                value={honeypot}
                                                onChange={(e) => setHoneypot(e.target.value)}
                                                tabIndex={-1}
                                                autoComplete="off"
                                            />
                                        </div>

                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="name"
                                                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                                            >
                                                Your Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={(e) => {
                                                    handleChange(e);
                                                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: "" }));
                                                }}
                                                required
                                                placeholder="John Doe"
                                                className={`w-full bg-secondary/20 border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${fieldErrors.name ? "border-destructive focus:border-destructive" : "border-border/30 focus:border-foreground/20"}`}
                                            />
                                            {fieldErrors.name && (
                                                <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="email"
                                                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                                            >
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={(e) => {
                                                    handleChange(e);
                                                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: "" }));
                                                }}
                                                required
                                                placeholder="john@example.com"
                                                className={`w-full bg-secondary/20 border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors ${fieldErrors.email ? "border-destructive focus:border-destructive" : "border-border/30 focus:border-foreground/20"}`}
                                            />
                                            {fieldErrors.email && (
                                                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
                                            )}
                                        </div>

                                        {/* Category */}
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="category"
                                                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                                            >
                                                Category
                                            </label>
                                            <select
                                                id="category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground/20 transition-colors"
                                            >
                                                <option value="general">General Inquiry</option>
                                                <option value="bug">Bug Report</option>
                                                <option value="feature">Feature Request</option>
                                                <option value="billing">Billing & Credits</option>
                                                <option value="feedback">Feedback</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        {/* Message */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label
                                                    htmlFor="message"
                                                    className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                                                >
                                                    Message
                                                </label>
                                                <span className="text-[10px] font-mono text-muted-foreground/60">
                                                    {formData.message.length} / 2000
                                                </span>
                                            </div>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={(e) => {
                                                    handleChange(e);
                                                    if (fieldErrors.message) setFieldErrors(prev => ({ ...prev, message: "" }));
                                                }}
                                                required
                                                rows={6}
                                                maxLength={2000}
                                                placeholder="Tell us how we can help..."
                                                className={`w-full bg-secondary/20 border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors resize-none ${fieldErrors.message ? "border-destructive focus:border-destructive" : "border-border/30 focus:border-foreground/20"}`}
                                            />
                                            {fieldErrors.message && (
                                                <p className="text-xs text-destructive mt-1">{fieldErrors.message}</p>
                                            )}
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={status === "sending"}
                                            className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {status === "sending" ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send Message
                                                </>
                                            )}
                                        </button>

                                        <p className="text-xs text-muted-foreground/40 text-center">
                                            By submitting this form, you agree to our{" "}
                                            <Link to="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
                                                Privacy Policy
                                            </Link>
                                        </p>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blog Section */}
                <section className="py-16 px-6 md:px-12 border-t border-border/30">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Kareerist Blog</span>
                                </div>
                                <h2 className="text-2xl font-bold">Career Insights & Tips</h2>
                                <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                                    Practical advice to land your dream job — from ATS optimization to salary negotiation.
                                </p>
                            </div>
                            <a
                                href="https://kareerisit-blog.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4 flex-shrink-0"
                            >
                                View all posts
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        {blogLoading ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                {[1,2,3].map(i => (
                                    <div key={i} className="rounded-2xl border border-border/30 bg-card/60 overflow-hidden animate-pulse">
                                        <div className="h-44 bg-secondary/40" />
                                        <div className="p-5 space-y-3">
                                            <div className="h-3 bg-secondary/40 rounded w-20" />
                                            <div className="h-4 bg-secondary/40 rounded w-full" />
                                            <div className="h-4 bg-secondary/40 rounded w-3/4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : blogPosts.length > 0 ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                {blogPosts.map(post => (
                                    <a
                                        key={post.id}
                                        href="https://kareerisit-blog.vercel.app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden hover:border-border/60 hover:shadow-lg transition-all duration-300 block"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative h-44 overflow-hidden">
                                            <img
                                                src={post.media_url}
                                                alt={post.title || "Career insights blog article thumbnail"}
                                                loading="lazy"
                                                decoding="async"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                            <span
                                                className="absolute bottom-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-full"
                                                style={{ backgroundColor: post.category_color }}
                                            >
                                                {post.category}
                                            </span>
                                        </div>
                                        {/* Content */}
                                        <div className="p-5">
                                            <h3 className="font-semibold text-sm leading-snug text-foreground/90 group-hover:text-foreground line-clamp-2 mb-2 transition-colors">
                                                {post.title}
                                            </h3>
                                            {post.description && (
                                                <p className="text-xs text-muted-foreground/60 line-clamp-2 leading-relaxed">
                                                    {post.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-primary">
                                                Read article
                                                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : null}

                        <div className="mt-8 text-center md:hidden">
                            <a
                                href="https://kareerisit-blog.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
                            >
                                View all posts <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-16 px-6 md:px-12 bg-secondary/20 border-t border-border/30">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8 text-center">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-4">
                            <details className="group rounded-xl border border-border/30 bg-card/60 p-5">
                                <summary className="cursor-pointer font-semibold text-foreground/90 list-none flex items-center justify-between">
                                    How long does it take to get a response?
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed">
                                    We aim to respond to all inquiries within 24-48 hours.
                                </p>
                            </details>

                            <details className="group rounded-xl border border-border/30 bg-card/60 p-5">
                                <summary className="cursor-pointer font-semibold text-foreground/90 list-none flex items-center justify-between">
                                    What should I include in a bug report?
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed">
                                    Please include: (1) What you were trying to do, (2) What happened instead,
                                    (3) Your browser and device, (4) Screenshots if possible. This helps us fix
                                    issues faster.
                                </p>
                            </details>

                            <details className="group rounded-xl border border-border/30 bg-card/60 p-5">
                                <summary className="cursor-pointer font-semibold text-foreground/90 list-none flex items-center justify-between">
                                    Can I request a refund for credits?
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed">
                                    Currently, Kareerist operates on a free credit system. If you encounter
                                    issues with credit deductions, please contact us with details and we'll
                                    investigate and restore credits if appropriate.
                                </p>
                            </details>

                            <details className="group rounded-xl border border-border/30 bg-card/60 p-5">
                                <summary className="cursor-pointer font-semibold text-foreground/90 list-none flex items-center justify-between">
                                    Do you offer enterprise or team plans?
                                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </summary>
                                <p className="mt-3 text-sm text-muted-foreground/70 leading-relaxed">
                                    We're currently focused on individual users, but we're exploring team and
                                    enterprise options. Contact us at kareerist2@gmail.com to discuss your needs.
                                </p>
                            </details>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
