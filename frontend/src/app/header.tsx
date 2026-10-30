import { Link } from "react-router-dom";

import { useAuthSession } from "@package/auth";
import { ThemeToggle, useColors, useIsMobile, hexToRgba } from "@package/ui";

export const Header = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const { isAuthenticated } = useAuthSession();

  return (
    <header
      css={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        background: colors.surfaceAlt,
        backdropFilter: "saturate(180%) blur(20px)",
        borderBottom: `1px solid ${colors.divider}`,
        boxShadow: `0 1px 0 0 ${colors.divider}, 0 1px 3px 0 ${hexToRgba(colors.textPrimary, 0.05)}`,
        transition: "all 0.2s ease",
      }}
    >
      <div
        css={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? 12 : 16,
          padding: isMobile ? "0 16px" : "0 20px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <Link
          to={isAuthenticated ? "/plan" : "/"}
          css={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <MealCalendarIcon size={40} />
          <div
            css={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            <div
              css={{
                fontWeight: 800,
                fontSize: isMobile ? 18 : 20,
                color: colors.textPrimary,
                letterSpacing: "-0.02em",
              }}
            >
              Mealendar
            </div>
            <div
              css={{
                fontSize: isMobile ? 11 : 12,
                color: colors.textSecondary,
                fontWeight: 500,
                letterSpacing: "0.02em",
              }}
            >
              Plan • Cook • Share
            </div>
          </div>
        </Link>

        <div css={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle compact={isMobile} />
        </div>
      </div>
    </header>
  );
};

const MealCalendarIcon = ({ size = 32 }: { size?: number }) => {
  const colors = useColors();

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect
        x="8"
        y="12"
        width="48"
        height="44"
        rx="4"
        fill={colors.surface}
        stroke={colors.textSecondary}
        strokeWidth="2"
      />

      <rect x="8" y="12" width="48" height="12" rx="4" fill={colors.primary} />
      <rect x="8" y="20" width="48" height="4" fill={colors.primary} />

      <rect x="18" y="6" width="3" height="12" rx="1.5" fill={colors.textSecondary} />
      <rect x="43" y="6" width="3" height="12" rx="1.5" fill={colors.textSecondary} />

      <circle cx="19.5" cy="16" r="1.5" fill={colors.surface} />
      <circle cx="44.5" cy="16" r="1.5" fill={colors.surface} />

      <circle
        cx="32"
        cy="38"
        r="10"
        fill={colors.surface}
        stroke={colors.textSecondary}
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="38"
        r="8"
        fill={colors.surface}
        stroke={colors.textMuted}
        strokeWidth="1"
      />

      <g transform="translate(18, 34)">
        <rect x="0" y="6" width="1.5" height="8" rx="0.75" fill={colors.textPrimary} />
        <rect x="-1" y="4" width="1" height="4" rx="0.5" fill={colors.textPrimary} />
        <rect x="0.25" y="4" width="1" height="4" rx="0.5" fill={colors.textPrimary} />
        <rect x="1.5" y="4" width="1" height="4" rx="0.5" fill={colors.textPrimary} />
      </g>

      <g transform="translate(44, 34)">
        <rect x="0" y="6" width="1.5" height="8" rx="0.75" fill={colors.textPrimary} />
        <path d="M0.75 4 L0.75 8 L2.5 6 Z" fill={colors.textSecondary} />
      </g>

      <circle cx="32" cy="36" r="0.5" fill={colors.textMuted} />
      <circle cx="30" cy="39" r="0.5" fill={colors.textMuted} />
      <circle cx="34" cy="39" r="0.5" fill={colors.textMuted} />
    </svg>
  );
};
