/**
 * HinglishToggle — optional "Convert to Hinglish" button.
 * Converts any English text block to Hinglish using the backend AI.
 * Used in Dashboard, ResumeAnalysis (HiringIntel), and Interview pages.
 */

import { useState } from "react";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { apiConvertToHinglish } from "@/lib/api";

interface HinglishToggleProps {
    /** The original English text */
    originalText: string;
    /** Called with the converted text (or original when reverted) */
    onConverted: (text: string) => void;
    /** Optional extra className for the button */
    className?: string;
    /** Label shown on button (default: "Hinglish mein samjho") */
    label?: string;
}

export function HinglishToggle({ originalText, onConverted, className = "", label }: HinglishToggleProps) {
    const [loading, setLoading] = useState(false);
    const [isHinglish, setIsHinglish] = useState(false);
    const [error, setError] = useState("");

    async function handleToggle() {
        if (isHinglish) {
            // Revert to original
            onConverted(originalText);
            setIsHinglish(false);
            setError("");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const converted = await apiConvertToHinglish(originalText);
            onConverted(converted);
            setIsHinglish(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Conversion failed. Try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
            <button
                onClick={handleToggle}
                disabled={loading || !originalText.trim()}
                title={isHinglish ? "Revert to English" : "Convert to Hinglish for easy understanding"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isHinglish
                        ? "border-orange-400/40 bg-orange-400/10 text-orange-400 hover:bg-orange-400/20"
                        : "border-border/40 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
            >
                {loading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : isHinglish
                        ? <RotateCcw className="w-3 h-3" />
                        : <Languages className="w-3 h-3" />
                }
                {loading
                    ? "Converting…"
                    : isHinglish
                        ? "English mein wapas"
                        : (label ?? "🇮🇳 Hinglish mein samjho")
                }
            </button>
            {error && <p className="text-[10px] text-red-400/70">{error}</p>}
        </div>
    );
}
