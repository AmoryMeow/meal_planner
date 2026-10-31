import { Link, useNavigate } from "react-router-dom";

import { useAuthSession } from "@package/auth";
import { ThemeToggle, useColors, useIsMobile, hexToRgba } from "@package/ui";

export const Header = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, isSigningOut, signOut, status } = useAuthSession();

  const handleSignOut = () => {
    void signOut()
      .catch(() => undefined)
      .then(() => navigate("/", { replace: true }));
  };

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
          {!isAuthenticated && status !== "loading" && (
            <SignInLink compact={isMobile} />
          )}
          {isAuthenticated && (
            <SignOutButton
              compact={isMobile}
              loading={isSigningOut}
              onClick={handleSignOut}
            />
          )}
        </div>
      </div>
    </header>
  );
};

const SignInLink = ({ compact }: { compact: boolean }) => {
  const actionStyles = useHeaderActionStyles(compact);

  return (
    <Link to="/login" aria-label="Sign in" title="Sign in" css={actionStyles}>
      <SignInIcon />
    </Link>
  );
};

const SignOutButton = ({
  compact,
  loading,
  onClick,
}: {
  compact: boolean;
  loading: boolean;
  onClick: () => void;
}) => {
  const actionStyles = useHeaderActionStyles(compact, loading);

  return (
    <button
      type="button"
      aria-busy={loading}
      aria-label="Sign out"
      title="Sign out"
      disabled={loading}
      onClick={onClick}
      css={actionStyles}
    >
      {loading ? <SignOutSpinner /> : <SignOutIcon />}
    </button>
  );
};

const useHeaderActionStyles = (compact: boolean, disabled = false) => {
  const colors = useColors();
  const size = compact ? 36 : 40;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    flex: "0 0 auto",
    padding: 0,
    borderRadius: 12,
    border: "1px solid transparent",
    background: colors.primary,
    color: colors.onPrimary,
    lineHeight: 1,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    boxShadow: `0 1px 0 ${hexToRgba(colors.border, 0.25)}`,
    transition: "background-color .15s ease, box-shadow .15s ease, transform .05s ease",
    "&:hover:not(:disabled)": {
      background: colors.primaryHover,
      boxShadow: `0 2px 6px ${hexToRgba(colors.border, 0.35)}`,
    },
    "&:active:not(:disabled)": {
      background: colors.primaryActive,
      transform: "translateY(0.5px)",
      boxShadow: `0 1px 2px ${hexToRgba(colors.border, 0.3)}`,
    },
    "&:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${colors.focus}`,
    },
  };
};

const SignInIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const SignOutIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const SignOutSpinner = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    css={{
      animation: "sign-out-spin 0.8s linear infinite",
      "@keyframes sign-out-spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
      "@media (prefers-reduced-motion: reduce)": {
        animation: "none",
      },
    }}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="3"
      strokeOpacity="0.25"
    />
    <path
      d="M12 3a9 9 0 0 1 9 9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

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
