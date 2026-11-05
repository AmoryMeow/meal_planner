import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthSession } from "@package/auth";
import {
  Button,
  getContentContainerStyles,
  ThemeToggle,
  useColors,
  useIsMobile,
  hexToRgba,
} from "@package/ui";

import { MealendarLogo } from "./mealendar-logo";

export const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isSigningOut, signOut, status } = useAuthSession();

  const handleSignIn = () => navigate("/login");

  const handleSignOut = () => {
    void signOut()
      .catch(() => undefined)
      .then(() => navigate("/", { replace: true }));
  };

  return (
    <HeaderLayout
      homePath={isAuthenticated ? "/home" : "/"}
      action={isMobile => (
        <>
          {!isAuthenticated && status !== "loading" && (
            <Button
              ariaLabel="Sign in"
              icon={<SignInIcon />}
              size={isMobile ? "sm" : "md"}
              onClick={handleSignIn}
            />
          )}
          {isAuthenticated && (
            <Button
              ariaLabel="Sign out"
              icon={<SignOutIcon />}
              size={isMobile ? "sm" : "md"}
              loading={isSigningOut}
              onClick={handleSignOut}
            />
          )}
        </>
      )}
    />
  );
};

export const ShowcaseHeader = () => (
  <HeaderLayout
    homePath="/"
    action={isMobile => (
      <Button
        ariaLabel="View source on GitHub"
        icon={<GitHubIcon />}
        size={isMobile ? "sm" : "md"}
        onClick={openSourceRepository}
      />
    )}
  />
);

const HeaderLayout = ({
  homePath,
  action,
}: {
  homePath: string;
  action: (isMobile: boolean) => ReactNode;
}) => {
  const colors = useColors();
  const isMobile = useIsMobile();

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
          ...getContentContainerStyles(isMobile),
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? 12 : 16,
        }}
      >
        <Link
          to={homePath}
          css={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <MealendarLogo size={44} />
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
                color: colors.primary,
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
          {action(isMobile)}
        </div>
      </div>
    </header>
  );
};

const openSourceRepository = () => {
  window.open(
    "https://github.com/AmoryMeow/meal_planner",
    "_blank",
    "noopener,noreferrer"
  );
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

const GitHubIcon = () => (
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
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.4 4 5 5 0 0 0 19.3.5S18.2.1 15 1.8a13.4 13.4 0 0 0-7 0C4.8.1 3.7.5 3.7.5A5 5 0 0 0 3.6 4a5.4 5.4 0 0 0-1.4 3.7c0 5.3 3.5 6.5 6.8 7A4.8 4.8 0 0 0 8 18v4" />
    <path d="M8 19c-3 .9-3-1.5-4-2" />
  </svg>
);
