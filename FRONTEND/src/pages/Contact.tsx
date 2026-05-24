import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import {
    Mail, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle,
    ArrowLeft, MapPin, Clock, Phone, Linkedin, Twitter, Instagram, Github
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
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("sending");
        setErrorMessage("");

        try {
            // TODO: Implement backend endpoint for contact form
            // For now, simulate sending
            await new Promise((resolve) => setTimeout(resolve, 1500));
            
            // Simulate success
            setStatus("success");
            setFormData({
                name: "",
                email: user?.email || "",
                category: "general",
                message: "",
            });

            // Reset success message after 5 seconds
            setTimeout(() => setStatus("idle"), 5000);
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

                                {/* WhatsApp */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <h3 className="text-lg font-semibold">WhatsApp</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground/70 leading-relaxed">
                                        Quick support via WhatsApp
                                    </p>
                                    <a
                                        href="https://wa.me/919220947734"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-emerald-500 hover:underline underline-offset-4"
                                    >
                                        +91 9220947734
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
                                        <a
                                            href="#"
                                            className="w-10 h-10 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/30 flex items-center justify-center transition-colors opacity-50 cursor-not-allowed"
                                            aria-label="LinkedIn"
                                        >
                                            <Linkedin className="w-4 h-4 text-muted-foreground" />
                                        </a>
                                        <a
                                            href="#"
                                            className="w-10 h-10 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/30 flex items-center justify-center transition-colors opacity-50 cursor-not-allowed"
                                            aria-label="GitHub"
                                        >
                                            <Github className="w-4 h-4 text-muted-foreground" />
                                        </a>
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
                                                onChange={handleChange}
                                                required
                                                placeholder="John Doe"
                                                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                                            />
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
                                                onChange={handleChange}
                                                required
                                                placeholder="john@example.com"
                                                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors"
                                            />
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
                                            <label
                                                htmlFor="message"
                                                className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
                                            >
                                                Message
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={6}
                                                placeholder="Tell us how we can help..."
                                                className="w-full bg-secondary/20 border border-border/30 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground/20 transition-colors resize-none"
                                            />
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
                                    We aim to respond to all inquiries within 24-48 hours. For urgent issues,
                                    please reach out via WhatsApp for faster support.
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
