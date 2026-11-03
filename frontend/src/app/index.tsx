import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import {
  AuthSessionProvider,
  GuestRoute,
  Login,
  ProtectedRoute,
  Register,
} from "@package/auth";
import { InviteAcceptance } from "@package/groups";
import { CreateMealPage, MealDetailsPage, Meals } from "@package/meals";
import { Plan } from "@package/plan";
import { PlanDetails, Plans } from "@package/plans";
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
        <Route path="/invite/:token" element={<InviteAcceptance />} />

        <Route element={<GuestRoute />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/home" element={<Plan />} />
            <Route path="/plan" element={<Navigate to="/home" replace />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/plans/:planId" element={<PlanDetails />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/meals/new" element={<CreateMealPage />} />
            <Route path="/meals/:mealId" element={<MealDetailsPage />} />
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
