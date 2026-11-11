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
import { PokerSessionDetails, PokerSessions } from "@package/poker";
import { ShoppingList } from "@package/shopping";
import { ThemeProvider, useColors } from "@package/ui";

import { Header, ShowcaseHeader } from "./header";
import { Landing } from "./landing";
import { Menu } from "./menu";

const isShowcase = import.meta.env.MODE === "pages";

export default function App() {
  if (isShowcase) {
    return (
      <ThemeProvider>
        <ShowcaseContent />
      </ThemeProvider>
    );
  }

  return (
    <AuthSessionProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthSessionProvider>
  );
}

const ShowcaseContent = () => {
  const colors = useColors();

  return (
    <div
      css={{
        minHeight: "100dvh",
        background: colors.background,
        color: colors.textPrimary,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ShowcaseHeader />
      <Landing showcase />
    </div>
  );
};

const AppContent = () => {
  const colors = useColors();

  return (
    <div
      css={{
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
            <Route path="/shopping-list" element={<ShoppingList />} />
            <Route path="/poker" element={<PokerSessions />} />
            <Route path="/poker/:sessionId" element={<PokerSessionDetails />} />
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
