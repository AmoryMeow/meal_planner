import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError } from "@package/api";

import { refreshToken, type AccessTokenResponse, type User } from "./api";
import { authQueryKeys, useLogoutMutation, useProfileQuery } from "./queries";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

type AuthSessionContextValue = {
  accessToken: string | null;
  error: Error | null;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  signIn: (session: AccessTokenResponse) => void;
  signOut: () => Promise<void>;
  status: AuthStatus;
  user: User | null;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);
  const profile = useProfileQuery(accessToken);
  const { mutateAsync: requestLogout, isPending: isSigningOut } = useLogoutMutation();

  useEffect(() => {
    let active = true;

    refreshToken()
      .then(session => {
        if (active) setAccessToken(session.access);
      })
      .catch((error: unknown) => {
        if (active && !isUnauthorized(error)) {
          setBootstrapError(toError(error));
        }
      })
      .finally(() => {
        if (active) setBootstrapComplete(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isUnauthorized(profile.error)) {
      setAccessToken(null);
      queryClient.removeQueries({ queryKey: authQueryKeys.profile() });
    }
  }, [profile.error, queryClient]);

  const signIn = useCallback((session: AccessTokenResponse) => {
    setBootstrapError(null);
    setBootstrapComplete(true);
    setAccessToken(session.access);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await requestLogout();
    } finally {
      setAccessToken(null);
      setBootstrapError(null);
      setBootstrapComplete(true);
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
    }
  }, [queryClient, requestLogout]);

  const profileError =
    profile.error && !isUnauthorized(profile.error) ? profile.error : null;
  const error = bootstrapError ?? profileError;
  const status = getAuthStatus({
    accessToken,
    bootstrapComplete,
    error,
    isProfilePending: profile.isPending,
    user: profile.data,
  });

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      accessToken,
      error,
      isAuthenticated: status === "authenticated",
      isSigningOut,
      signIn,
      signOut,
      status,
      user: profile.data ?? null,
    }),
    [accessToken, error, isSigningOut, profile.data, signIn, signOut, status]
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession must be used within <AuthSessionProvider>");
  }

  return context;
};

type AuthStatusInput = {
  accessToken: string | null;
  bootstrapComplete: boolean;
  error: Error | null;
  isProfilePending: boolean;
  user: User | undefined;
};

const getAuthStatus = ({
  accessToken,
  bootstrapComplete,
  error,
  isProfilePending,
  user,
}: AuthStatusInput): AuthStatus => {
  if (!bootstrapComplete || (accessToken && isProfilePending)) return "loading";
  if (error) return "error";
  if (accessToken && user) return "authenticated";
  return "anonymous";
};

const isUnauthorized = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 401;

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error("Unknown authentication error");
