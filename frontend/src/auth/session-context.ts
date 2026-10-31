import { createContext, useContext } from "react";

import type { AccessTokenResponse, AuthenticatedRequest, User } from "./api";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export type AuthSessionContextValue = {
  error: Error | null;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  request: AuthenticatedRequest;
  signIn: (session: AccessTokenResponse) => void;
  signOut: () => Promise<void>;
  status: AuthStatus;
  user: User | null;
};

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within <AuthSessionProvider>");
  }

  return context;
};
