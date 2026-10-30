import { Routes, Route } from "react-router-dom";

import { AuthSessionProvider, Login, Register, useAuthSession } from "@package/auth";
import { ThemeProvider, useColors, useIsMobile } from "@package/ui";

import { Header } from "./header";
import { Landing } from "./landing";
import { Menu } from "./menu";

export default function App() {
  return (
    <AuthSessionProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthSessionProvider>
  );
}

const AppContent = () => {
  const colors = useColors();
  const { isAuthenticated, status } = useAuthSession();

  if (status === "loading") {
    return (
      <div
        role="status"
        css={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: colors.background,
          color: colors.textSecondary,
        }}
      >
        Restoring session…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        css={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: colors.background,
          color: colors.danger,
          textAlign: "center",
        }}
      >
        Unable to restore your session. Please reload the page.
      </div>
    );
  }

  return (
    <div
      css={{
        "--header-h": "64px",
        "--nav-h": "40px",
        minHeight: "100dvh",
        background: colors.background,
        color: colors.textPrimary,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />
      {isAuthenticated && <Menu variant="top" />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<Main isAuthenticated={isAuthenticated} />} />
      </Routes>

      {isAuthenticated && <Menu variant="bottom" />}
    </div>
  );
};

const Main = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  const colors = useColors();
  const isMobile = useIsMobile();

  return (
    <main
      css={{
        display: "grid",
        paddingBottom: isMobile
          ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
          : "48px",
      }}
    >
      {!isAuthenticated ? (
        <Landing />
      ) : (
        <main
          css={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "20px 16px" : "32px 24px",
            paddingBottom: isMobile
              ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
              : "48px",
          }}
        >
          <h1 css={{ color: colors.textPrimary }}>Dashboard</h1>
          <p css={{ color: colors.textSecondary }}>
            Welcome back! Here you can manage your meal plans and recipes.
          </p>
        </main>
      )}
    </main>
  );
};
