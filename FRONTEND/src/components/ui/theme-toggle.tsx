import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return true;
  const savedTheme = localStorage.getItem("theme");
  // Default to dark mode unless user explicitly chose light
  return savedTheme !== "light";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  // Sync the class on mount (in case the inline script and React somehow disagree)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for OS-level theme changes when user has no explicit preference saved
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem("theme");
      if (!savedTheme) {
        // Only follow OS preference if user hasn't explicitly chosen
        setIsDark(e.matches);
        document.documentElement.classList.toggle("dark", e.matches);
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const newIsDark = !prev;
      document.documentElement.classList.toggle("dark", newIsDark);
      localStorage.setItem("theme", newIsDark ? "dark" : "light");
      return newIsDark;
    });
  }, []);

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full hover:bg-secondary transition-colors duration-200"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-5 w-5" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-5 w-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}