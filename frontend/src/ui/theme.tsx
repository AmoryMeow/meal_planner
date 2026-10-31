import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Themes = "light" | "dark";

type ThemeContextValue = {
  theme: Themes;
  setTheme: (t: Themes) => void;
  toggle: () => void;
  system: Themes;
};

const STORAGE_KEY = "theme";
const COLOR_SCHEME_MQ = "(prefers-color-scheme: dark)";

const getSystemTheme = (): Themes => {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia(COLOR_SCHEME_MQ).matches ? "dark" : "light";
};

const getInitialTheme = (): Themes => {
  if (typeof window === "undefined") return "light";
  let saved = "";
  try {
    saved = (window.localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
  } catch {
    saved = "";
  }
  if (saved === "light" || saved === "dark") return saved as Themes;
  return getSystemTheme();
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Themes>(getInitialTheme);
  const [system, setSystem] = useState<Themes>(getSystemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(COLOR_SCHEME_MQ);
    const onChange = () => setSystem(getSystemTheme());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      void 0;
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(t => (t === "light" ? "dark" : "light")),
      system,
    }),
    [theme, system]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
};
