import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function ComingSoon() {
    return (
        <div className="relative min-h-screen flex flex-col bg-[#0B0D10] text-[#ededed] overflow-hidden">
            {/* Optional: Subtle Grid Background */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* 1. Minimal Navigation (Top Left) */}
            <div className="absolute top-8 left-8 md:top-12 md:left-12 z-20">
                <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-neutral-400">
                    Kareerist
                </span>
            </div>

            {/* Main Content Container */}
            <main className="flex-grow flex flex-col items-center justify-center px-6 relative z-10 w-full max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full text-center"
                >
                    {/* 2. Hero Section */}
                    <div className="mb-12 md:mb-16">
                        <h1 className="heading-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight font-normal text-white mb-6">
                            The Operating System
                            <br />
                            for Your Career <span className="text-neutral-500">launches soon.</span>
                        </h1>
                        
                        <p className="text-sm md:text-base text-neutral-500 font-medium tracking-wide max-w-lg mx-auto">
                            We’re opening early access in controlled waves.
                        </p>
                    </div>

                    {/* Email Capture Form */}
                    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-6">
                        <div className="flex flex-col sm:flex-row w-full gap-3">
                            <input
                                type="email"
                                placeholder="your@email.com"
                                className="flex-1 h-12 bg-transparent border border-neutral-800 rounded-md px-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] transition-all duration-300"
                            />
                            <button className="h-12 px-6 bg-white text-black text-sm font-medium rounded-md hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-center gap-2 group whitespace-nowrap">
                                Request Early Access
                                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                            </button>
                        </div>
                        
                        {/* Small System Line */}
                        <p className="text-[10px] uppercase tracking-wider text-neutral-700 font-medium">
                            Access is limited while we calibrate the system.
                        </p>
                    </div>
                </motion.div>

                {/* 3. Divider Section */}
                <div className="w-full max-w-md h-px bg-neutral-900 my-16 md:my-24" />

                {/* 4. Authority Block */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-center space-y-8"
                >
                    <h2 className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-semibold mb-6">
                        What We're Building
                    </h2>
                    
                    <div className="flex flex-col gap-4 text-sm md:text-base text-neutral-400 font-light tracking-wide">
                        <p>Structured around real hiring standards</p>
                        <p>Designed to replace guesswork with signal</p>
                        <p>Built for measurable progress</p>
                    </div>
                </motion.div>
            </main>

            {/* 5. Subtle Footer */}
            <footer className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row justify-between items-center text-[10px] text-neutral-700 uppercase tracking-wider font-medium gap-4">
                <span className="md:w-1/3 text-left">Kareerist © 2026</span>
                
                <span className="md:w-1/3 text-center hidden md:block opacity-60">
                    Career clarity. Engineered.
                </span>
                
                <div className="md:w-1/3 flex justify-end gap-6">
                    <a href="#" className="hover:text-neutral-500 transition-colors">Twitter</a>
                    <a href="#" className="hover:text-neutral-500 transition-colors">LinkedIn</a>
                </div>
            </footer>
        </div>
    );
}
