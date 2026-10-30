import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useColors } from "@package/ui";

import { useAuthSession } from "./session";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { status } = useAuthSession();

  if (status === "loading") {
    return <SessionLoader />;
  }

  if (status === "error") {
    return (
      <SessionStatus>
        Unable to restore your session. Please reload the page.
      </SessionStatus>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const GuestRoute = () => {
  const { status } = useAuthSession();

  if (status === "loading") {
    return <SessionLoader />;
  }

  if (status === "authenticated") {
    return <Navigate to="/plan" replace />;
  }

  return <Outlet />;
};

const SessionLoader = () => {
  const colors = useColors();

  return (
    <div
      role="status"
      aria-label="Restoring session"
      css={{
        minHeight: "calc(100dvh - var(--header-h))",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <svg
        aria-hidden="true"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        css={{
          animation: "session-spin 0.8s linear infinite",
          "@keyframes session-spin": {
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
          r="10"
          stroke={colors.primary}
          strokeWidth="3"
          strokeOpacity="0.2"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={colors.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

const SessionStatus = ({ children }: { children: React.ReactNode }) => {
  const colors = useColors();

  return (
    <div
      role="alert"
      css={{
        minHeight: "calc(100dvh - var(--header-h))",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: colors.danger,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
};
