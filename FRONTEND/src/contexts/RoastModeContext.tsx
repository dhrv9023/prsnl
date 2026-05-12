import { createContext, useContext, ReactNode } from "react";

// Roast mode has been removed. No-op stub retained for any stray imports.

interface RoastModeContextType {
  isRoastMode: boolean;
  toggleRoastMode: () => void;
  roastLanguage: string;
  setRoastLanguage: (lang: string) => void;
}

const RoastModeContext = createContext<RoastModeContextType>({
  isRoastMode: false,
  toggleRoastMode: () => {},
  roastLanguage: "english",
  setRoastLanguage: () => {},
});

export function RoastModeProvider({ children }: { children: ReactNode }) {
  return (
    <RoastModeContext.Provider
      value={{ isRoastMode: false, toggleRoastMode: () => {}, roastLanguage: "english", setRoastLanguage: () => {} }}
    >
      {children}
    </RoastModeContext.Provider>
  );
}

export function useRoastMode() {
  return useContext(RoastModeContext);
}
