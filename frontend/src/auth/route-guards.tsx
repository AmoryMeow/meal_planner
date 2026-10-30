import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useColors } from "@package/ui";

import { useAuthSession } from "./session";

export const ProtectedRoute = () => {
  const location = useLocation();
  const { status } = useAuthSession();

  if (status === "loading") {
    return <SessionStatus role="status">Restoring session…</SessionStatus>;
  }

  if (status === "error") {
    return (
      <SessionStatus role="alert">
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
    return <SessionStatus role="status">Restoring session…</SessionStatus>;
  }

  if (status === "authenticated") {
    return <Navigate to="/plan" replace />;
  }

  return <Outlet />;
};

const SessionStatus = ({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "alert" | "status";
}) => {
  const colors = useColors();

  return (
    <div
      role={role}
      css={{
        minHeight: "calc(100dvh - var(--header-h))",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: role === "alert" ? colors.danger : colors.textSecondary,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
};
