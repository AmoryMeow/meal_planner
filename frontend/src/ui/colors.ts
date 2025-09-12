import { Themes, useTheme } from "./theme";

type Colors = {
  background: string; // Global app/page background
  surface: string; // Primary surface (content area)
  surfaceAlt: string; // Alternate surface (zebra/secondary panels)

  textPrimary: string; // Primary text (headings, important content)
  textSecondary: string; // Secondary text (descriptions, captions)
  textMuted: string; // Placeholders/helpers

  border: string; // Field/card borders
  divider: string; // List/section dividers

  link: string; // Links
  linkHover: string; // Link hover

  primary: string; // Primary buttons/accents
  primaryHover: string; // Primary hover
  primaryActive: string; // Primary active/pressed
  onPrimary: string; // Text/icons on Primary (contrast)

  success: string; // Success (icons/text)
  successBg: string; // Success badge background

  warning: string; // Warning
  warningBg: string; // Warning badge background

  danger: string; // Error/danger
  dangerBg: string; // Error badge background

  info: string; // Info/neutral statuses
  infoBg: string; // Info badge background

  accent: string; // Extra accent (tags, features)
  accentBg: string; // Accent badge background

  badge: string; // Counters/badges
  chip: string; // Chips/tags/pills

  focus: string; // Focus ring/outline
};

const tokens = {
  neutral0: "#FFFFFF",
  neutral25: "#F8FAFC",
  neutral50: "#F1F5F9",
  neutral100: "#E2E8F0",
  neutral200: "#CBD5E1",
  neutral300: "#94A3B8",
  neutral400: "#64748B",
  neutral500: "#475569",
  neutral600: "#334155",
  neutral700: "#1E293B",
  neutral800: "#0F172A",
  neutral850: "#0C1426",
  neutral900: "#020617",
  neutral950: "#010409",

  primary50: "#F0F9FF",
  primary100: "#E0F2FE",
  primary200: "#BAE6FD",
  primary300: "#7DD3FC",
  primary400: "#38BDF8",
  primary500: "#0EA5E9", // Main accent blue
  primary600: "#0284C7",
  primary700: "#0369A1",
  primary800: "#075985",
  primary900: "#0C4A6E",

  success50: "#ECFDF5",
  success100: "#D1FAE5",
  success400: "#34D399",
  success500: "#10B981",

  warning50: "#FFFBEB",
  warning100: "#FEF3C7",
  warning500: "#F59E0B",

  danger50: "#FFF1F2",
  danger100: "#FFE4E6",
  danger400: "#FB7185",
  danger500: "#F43F5E",

  info50: "#ECFEFF",
  info100: "#CFFAFE",
  info400: "#22D3EE",
  info500: "#06B6D4",

  accent50: "#F5F3FF",
  accent100: "#EDE9FE",
  accent400: "#A78BFA",
  accent500: "#8B5CF6",
};

export function hexToRgba(hex: string, alpha = 1): string {
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);

  if (h.length === 3) {
    h = h
      .split("")
      .map(c => c + c)
      .join("");
  }
  if (h.length !== 6 && h.length !== 8) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  let a = alpha;
  if (h.length === 8) {
    const aHex = parseInt(h.slice(6, 8), 16) / 255;
    a = Math.max(0, Math.min(1, aHex * alpha));
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export const useColors = () => {
  const { theme } = useTheme();

  const colors: { [key in Themes]: Colors } = {
    light: {
      background: tokens.neutral25,
      surface: tokens.neutral0,
      surfaceAlt: tokens.neutral50,
      textPrimary: tokens.neutral900,
      textSecondary: tokens.neutral600,
      textMuted: tokens.neutral400,
      border: tokens.neutral200,
      divider: tokens.neutral100,
      link: tokens.primary500,
      linkHover: tokens.primary600,
      primary: tokens.primary500,
      primaryHover: tokens.primary600,
      primaryActive: tokens.primary700,
      onPrimary: tokens.neutral0,
      success: tokens.success500,
      successBg: tokens.success50,
      warning: tokens.warning500,
      warningBg: tokens.warning50,
      danger: tokens.danger500,
      dangerBg: tokens.danger50,
      info: tokens.info500,
      infoBg: tokens.info50,
      accent: tokens.accent500,
      accentBg: tokens.accent50,
      badge: tokens.primary400,
      chip: tokens.neutral100,
      focus: tokens.primary400,
    },
    dark: {
      background: tokens.neutral950,
      surface: tokens.neutral900,
      surfaceAlt: tokens.neutral850,
      textPrimary: tokens.neutral25,
      textSecondary: tokens.neutral200,
      textMuted: tokens.neutral400,
      border: tokens.neutral700,
      divider: tokens.neutral800,
      link: tokens.primary400,
      linkHover: tokens.primary300,
      primary: tokens.primary400,
      primaryHover: tokens.primary300,
      primaryActive: tokens.primary500,
      onPrimary: tokens.neutral900,
      success: tokens.success400,
      successBg: tokens.success100,
      warning: tokens.warning500,
      warningBg: tokens.warning100,
      danger: tokens.danger400,
      dangerBg: tokens.danger100,
      info: tokens.info400,
      infoBg: tokens.info100,
      accent: tokens.accent400,
      accentBg: tokens.accent100,
      badge: tokens.primary300,
      chip: tokens.neutral800,
      focus: tokens.primary400,
    },
  };

  return colors[theme];
};
