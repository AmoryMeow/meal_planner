import { apiRequest, type RequiredFields } from "@package/api";
import type {
  AccessToken,
  LoginRequestRequest,
  RegistrationResponse,
  UserProfile,
  UserRegistrationRequest,
} from "@package/api/generated/schema";

export type User = RequiredFields<UserProfile, "first_name" | "last_name">;

export type AuthenticatedRequest = <T>(
  path: string,
  options?: RequestInit
) => Promise<T>;

export type {
  AccessToken as AccessTokenResponse,
  LoginRequestRequest as LoginInput,
  RegistrationResponse,
  UserRegistrationRequest as RegistrationInput,
};

let refreshRequest: Promise<AccessToken> | null = null;

export const register = (input: UserRegistrationRequest) =>
  apiRequest<RegistrationResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const login = (input: LoginRequestRequest) =>
  apiRequest<AccessToken>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const refreshToken = () => {
  if (!refreshRequest) {
    refreshRequest = apiRequest<AccessToken>("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({}),
    }).finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
};

export const logout = () =>
  apiRequest<void>("/auth/logout/", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const getProfile = (request: AuthenticatedRequest) => request<User>("/me/");
