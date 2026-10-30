import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import {
  AuthSessionProvider,
  GuestRoute,
  Login,
  ProtectedRoute,
  Register,
} from "@package/auth";
import { Plan } from "@package/plan";
import { ThemeProvider, useColors } from "@package/ui";

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

      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/plan" element={<AuthenticatedLayout />}>
            <Route index element={<Plan />} />
            <Route path="*" element={<Plan />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const AuthenticatedLayout = () => (
  <>
    <Menu variant="top" />
    <Outlet />
    <Menu variant="bottom" />
  </>
);
