import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Target, BarChart3, Sparkles, Sun, Moon } from "lucide-react";

const features = [
    {
        icon: Target,
        title: "Hiring Standards",
        description: "Structured around real-world hiring criteria used by top companies.",
    },
    {
        icon: Sparkles,
        title: "Signal Over Noise",
        description: "Designed to replace guesswork with clear, actionable career signals.",
    },
    {
        icon: BarChart3,
        title: "Measurable Growth",
        description: "Built for tracking your progress with data-backed milestones.",
    },
];

export function ComingSoon() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("theme");
            if (stored) return stored === "dark";
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        }
        return true;
    });

    useEffect(() => {
        const root = document.documentElement;
        if (isDark) {
            root.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            root.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDark]);

    return (
        <div className="relative min-h-screen flex flex-col bg-white dark:bg-[#0B0D10] text-neutral-900 dark:text-[#ededed] overflow-hidden transition-colors duration-500">
            {/* Subtle Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                }}
            />
            {/* Dark grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                }}
            />

            {/* Navigation Bar */}
            <div className="relative z-20 px-5 py-5 sm:px-8 sm:py-6 md:px-12 lg:px-16 flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-500 dark:text-neutral-400">
                    Kareerist
                </span>
                {/* Theme Toggle */}
                <button
                    onClick={() => setIsDark(!isDark)}
                    className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-white/[0.04] flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-300"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-center px-5 sm:px-8 md:px-16 lg:px-20 relative z-10 w-full mx-auto pt-4 sm:pt-0">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full text-center"
                >
                    {/* Hero Section */}
                    <div className="mb-10 sm:mb-12 md:mb-16">
                        <h1 className="heading-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight font-normal text-neutral-900 dark:text-white mb-4 sm:mb-6">
                            The Operating System
                            <br />
                            for Your Career{" "}
                            <span className="text-neutral-400 dark:text-neutral-500">launches soon.</span>
                        </h1>

                        <p className="text-xs sm:text-sm md:text-base text-neutral-500 dark:text-neutral-500 font-medium tracking-wide max-w-lg mx-auto px-4 sm:px-0">
                            We're opening early access in controlled waves.
                        </p>
                    </div>

                    {/* Email Capture Form */}
                    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
                        <div className="flex flex-col sm:flex-row w-full gap-3">
                            <input
                                type="email"
                                placeholder="your@email.com"
                                className="flex-1 h-11 sm:h-12 bg-transparent border border-neutral-300 dark:border-neutral-800 rounded-md px-4 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-neutral-500 dark:focus:border-neutral-600 focus:shadow-[0_0_15px_rgba(0,0,0,0.05)] dark:focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] transition-all duration-300"
                            />
                            <button className="h-11 sm:h-12 px-5 sm:px-6 bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:-translate-y-0.5 hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap">
                                Request Early Access
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </button>
                        </div>

                        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-700 font-medium">
                            Access is limited while we calibrate the system.
                        </p>
                    </div>
                </motion.div>

                {/* Divider */}
                <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-800 to-transparent my-12 sm:my-16 md:my-20" />

                {/* What We're Building — Card Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="w-full max-w-6xl mx-auto mb-16 sm:mb-20 md:mb-24"
                >
                    <h2 className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500 font-semibold text-center mb-8 sm:mb-10 md:mb-12">
                        What We're Building
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.15, duration: 0.6 }}
                                className="group relative border border-neutral-200 dark:border-neutral-800/60 rounded-xl p-5 sm:p-6 hover:border-neutral-300 dark:hover:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-white/[0.01] transition-all duration-500"
                            >
                                {/* Subtle glow on hover */}
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-neutral-100/50 dark:from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center text-center space-y-3 sm:space-y-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-neutral-800/50 flex items-center justify-center group-hover:border-neutral-300 dark:group-hover:border-neutral-700 transition-colors duration-500">
                                        <feature.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-neutral-500 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors duration-500" />
                                    </div>
                                    <h3 className="text-[12px] sm:text-[13px] font-semibold text-neutral-700 dark:text-neutral-300 tracking-wide uppercase">
                                        {feature.title}
                                    </h3>
                                    <p className="text-[11px] sm:text-[12px] text-neutral-500 dark:text-neutral-600 leading-relaxed font-light">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full">
                {/* Top gradient divider */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-800 to-transparent" />

                <div className="w-full px-5 sm:px-8 md:px-16 lg:px-20">
                    {/* Footer Main Content */}
                    <div className="py-10 sm:py-12 md:py-14">
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-16">
                            {/* Brand Column */}
                            <div className="col-span-2 sm:col-span-2 md:col-span-1 space-y-4 mb-2 sm:mb-0">
                                <span className="heading-display text-lg sm:text-xl text-neutral-900 dark:text-white">
                                    Kareerist
                                </span>
                                <p className="text-[12px] sm:text-[13px] text-neutral-500 dark:text-neutral-500 leading-relaxed max-w-[280px]">
                                    The operating system for your career. Structured preparation meets intelligent guidance.
                                </p>
                                {/* Social Icons Row */}
                                <div className="flex gap-3 pt-2">
                                    {[
                                        {
                                            label: "Twitter",
                                            href: "#",
                                            svg: (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            label: "LinkedIn",
                                            href: "#",
                                            svg: (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                                </svg>
                                            ),
                                        },
                                        {
                                            label: "Instagram",
                                            href: "#",
                                            svg: (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                                </svg>
                                            ),
                                        },
                                    ].map((social) => (
                                        <a
                                            key={social.label}
                                            href={social.href}
                                            aria-label={social.label}
                                            className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-white/[0.03] border border-neutral-200 dark:border-neutral-800/50 flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-white/[0.06] transition-all duration-300"
                                        >
                                            {social.svg}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Product Column */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500 dark:text-neutral-400">
                                    Product
                                </h4>
                                <ul className="space-y-2.5">
                                    {["Features", "Pricing", "Changelog", "Roadmap"].map((link) => (
                                        <li key={link}>
                                            <a
                                                href="#"
                                                className="text-[12px] sm:text-[13px] text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors duration-300"
                                            >
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Company Column */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500 dark:text-neutral-400">
                                    Company
                                </h4>
                                <ul className="space-y-2.5">
                                    {["About", "Blog", "Careers", "Contact"].map((link) => (
                                        <li key={link}>
                                            <a
                                                href="#"
                                                className="text-[12px] sm:text-[13px] text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors duration-300"
                                            >
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Legal Column */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] sm:text-[11px] font-semibold tracking-[0.2em] uppercase text-neutral-500 dark:text-neutral-400">
                                    Legal
                                </h4>
                                <ul className="space-y-2.5">
                                    {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((link) => (
                                        <li key={link}>
                                            <a
                                                href="#"
                                                className="text-[12px] sm:text-[13px] text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors duration-300"
                                            >
                                                {link}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="w-full h-px bg-neutral-200 dark:bg-neutral-800/50" />
                    <div className="py-5 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <span className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-700 font-medium tracking-wider">
                            © 2026 Kareerist. All rights reserved.
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-neutral-300 dark:text-neutral-800 font-medium tracking-wider uppercase hidden sm:block">
                            Career clarity. Engineered.
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
