import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoastModeContextType {
  isRoastMode: boolean;
  toggleRoastMode: () => void;
  roastLanguage: string;
  setRoastLanguage: (lang: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const RoastModeContext = createContext<RoastModeContextType>({
  isRoastMode: false,
  toggleRoastMode: () => {},
  roastLanguage: "english",
  setRoastLanguage: () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kareerist_roast_mode";
const LANG_STORAGE_KEY = "kareerist_roast_lang";

export function RoastModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isRoastMode, setIsRoastMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [roastLanguage, setRoastLanguageState] = useState<string>(() => {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY) || "english";
    } catch {
      return "english";
    }
  });

  // Apply / remove the CSS class on <html> whenever mode changes
  useEffect(() => {
    const html = document.documentElement;
    if (isRoastMode) {
      html.classList.add("roast-mode");
    } else {
      html.classList.remove("roast-mode");
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(isRoastMode));
    } catch {
      // ignore
    }
  }, [isRoastMode]);

  const toggleRoastMode = useCallback(() => {
    setIsRoastMode((prev) => !prev);
  }, []);

  const setRoastLanguage = useCallback((lang: string) => {
    setRoastLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  return (
    <RoastModeContext.Provider
      value={{ isRoastMode, toggleRoastMode, roastLanguage, setRoastLanguage }}
    >
      {children}
    </RoastModeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRoastMode() {
  return useContext(RoastModeContext);
}
