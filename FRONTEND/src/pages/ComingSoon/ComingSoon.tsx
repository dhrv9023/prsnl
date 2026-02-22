import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function ComingSoon() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-[#ededed] overflow-hidden selection:bg-white/20">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-40 pointer-events-none" />

            {/* Top Left Logo */}
            <div className="absolute top-8 left-8 md:top-12 md:left-12">
                <span className="text-sm font-semibold tracking-widest uppercase opacity-90">
                    Kareerist
                </span>
            </div>

            {/* Main Content */}
            <div className="container max-w-4xl px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-8"
                >
                    <h1 className="heading-display text-6xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tight">
                        Kareerist is
                        <br />
                        entering
                        <br />
                        its next phase.
                    </h1>

                    <p className="body-large text-lg md:text-xl text-neutral-400 font-light max-w-lg mx-auto leading-relaxed">
                        We're opening access in controlled waves.
                        <br className="hidden md:block" />
                        Join the waitlist to get early entry.
                    </p>

                    {/* Waitlist Form */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 max-w-md mx-auto w-full">
                        <input
                            type="email"
                            placeholder="you@example.com"
                            className="w-full h-12 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-light text-sm"
                        />
                        <button className="w-full sm:w-auto h-12 px-6 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all group whitespace-nowrap">
                            Request Early Access
                            <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>

                    <div className="pt-8">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-medium">
                            Built around real hiring standards.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end text-[10px] text-neutral-600 uppercase tracking-wider font-medium">
                <span>© 2026 Kareerist</span>
                <a href="#" className="hover:text-neutral-400 transition-colors">Twitter</a>
            </div>
        </div>
    );
}
