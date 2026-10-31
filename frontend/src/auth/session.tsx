import { useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, apiRequest } from "@package/api";

import {
  refreshToken,
  type AccessTokenResponse,
  type AuthenticatedRequest,
} from "./api";
import { authQueryKeys, useLogoutMutation, useProfileQuery } from "./queries";
import {
  AuthSessionContext,
  type AuthSessionContextValue,
  type AuthStatus,
} from "./session-context";

export const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const refreshAccessTokenRef = useRef<Promise<string> | null>(null);
  const sessionRevisionRef = useRef(0);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<Error | null>(null);

  const updateAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
    setAccessToken(token);
  }, []);

  const clearSession = useCallback(() => {
    sessionRevisionRef.current += 1;
    updateAccessToken(null);
    setBootstrapError(null);
    setBootstrapComplete(true);
    queryClient.removeQueries({ queryKey: authQueryKeys.all });
  }, [queryClient, updateAccessToken]);

  const refreshAccessToken = useCallback((): Promise<string> => {
    if (!refreshAccessTokenRef.current) {
      const sessionRevision = sessionRevisionRef.current;
      const refreshRequest = refreshToken()
        .then(session => {
          if (sessionRevisionRef.current !== sessionRevision) {
            throw new Error("Authentication session changed during token refresh");
          }

          updateAccessToken(session.access);
          return session.access;
        })
        .finally(() => {
          if (refreshAccessTokenRef.current === refreshRequest) {
            refreshAccessTokenRef.current = null;
          }
        });

      refreshAccessTokenRef.current = refreshRequest;
    }

    return refreshAccessTokenRef.current;
  }, [updateAccessToken]);

  const authenticatedRequest = useCallback<AuthenticatedRequest>(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      let requestToken = accessTokenRef.current;

      if (!requestToken) {
        try {
          requestToken = await refreshAccessToken();
        } catch (error: unknown) {
          if (isUnauthorized(error)) clearSession();
          throw error;
        }
      }

      try {
        return await requestWithAccessToken<T>(path, options, requestToken);
      } catch (error: unknown) {
        if (!isUnauthorized(error)) throw error;
      }

      const currentToken = accessTokenRef.current;
      let retryToken: string;

      if (currentToken && currentToken !== requestToken) {
        retryToken = currentToken;
      } else {
        try {
          retryToken = await refreshAccessToken();
        } catch (error: unknown) {
          if (isUnauthorized(error)) clearSession();
          throw error;
        }
      }

      try {
        return await requestWithAccessToken<T>(path, options, retryToken);
      } catch (error: unknown) {
        if (isUnauthorized(error)) clearSession();
        throw error;
      }
    },
    [clearSession, refreshAccessToken]
  );

  const profile = useProfileQuery(accessToken, authenticatedRequest);
  const { mutateAsync: requestLogout, isPending: isSigningOut } = useLogoutMutation();

  useEffect(() => {
    let active = true;

    refreshAccessToken()
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
  }, [refreshAccessToken]);

  useEffect(() => {
    if (isUnauthorized(profile.error)) {
      updateAccessToken(null);
      queryClient.removeQueries({ queryKey: authQueryKeys.profile() });
    }
  }, [profile.error, queryClient, updateAccessToken]);

  const signIn = useCallback(
    (session: AccessTokenResponse) => {
      sessionRevisionRef.current += 1;
      setBootstrapError(null);
      setBootstrapComplete(true);
      updateAccessToken(session.access);
    },
    [updateAccessToken]
  );

  const signOut = useCallback(async () => {
    sessionRevisionRef.current += 1;

    try {
      await requestLogout();
    } finally {
      clearSession();
    }
  }, [clearSession, requestLogout]);

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
      error,
      isAuthenticated: status === "authenticated",
      isSigningOut,
      request: authenticatedRequest,
      signIn,
      signOut,
      status,
      user: profile.data ?? null,
    }),
    [authenticatedRequest, error, isSigningOut, profile.data, signIn, signOut, status]
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
};

type AuthStatusInput = {
  accessToken: string | null;
  bootstrapComplete: boolean;
  error: Error | null;
  isProfilePending: boolean;
  user: AuthSessionContextValue["user"] | undefined;
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

const requestWithAccessToken = <T,>(
  path: string,
  options: RequestInit,
  accessToken: string
): Promise<T> => apiRequest<T>(path, { ...options, accessToken });
