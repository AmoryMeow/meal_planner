import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useColors, hexToRgba } from "./colors";

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

export const ThemeToggle = ({ compact = true }: { compact?: boolean }) => {
  const { theme, toggle } = useTheme();
  const colors = useColors();
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  const size = compact ? 36 : 40;
  const padX = compact ? 10 : 12;

  return (
    <button
      css={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: size,
        minWidth: size,
        padding: `0 ${padX}px`,
        borderRadius: 12,
        border: "1px solid transparent",
        background: colors.primary,
        color: colors.onPrimary,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: `0 1px 0 ${hexToRgba(colors.border, 0.25)}`,
        transition:
          "background-color .15s ease, box-shadow .15s ease, transform .05s ease",
        "&:hover": {
          background: colors.primaryHover,
          boxShadow: `0 2px 6px ${hexToRgba(colors.border, 0.35)}`,
        },
        "&:active": {
          background: colors.primaryActive,
          transform: "translateY(0.5px)",
          boxShadow: `0 1px 2px ${hexToRgba(colors.border, 0.3)}`,
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${colors.focus}`,
        },
      }}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {theme === "dark" ? <MoonIcon size={20} /> : <SunIcon size={20} />}
    </button>
  );
};

const SunIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
