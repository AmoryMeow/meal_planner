import { apiRequest } from "@package/api";

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
};

export type AccessTokenResponse = {
  access: string;
};

export type RegistrationResponse = AccessTokenResponse & {
  user: User;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegistrationInput = LoginInput & {
  first_name: string;
  last_name: string;
  password_confirm: string;
};

let refreshRequest: Promise<AccessTokenResponse> | null = null;

export const register = (input: RegistrationInput) =>
  apiRequest<RegistrationResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const login = (input: LoginInput) =>
  apiRequest<AccessTokenResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const refreshToken = () => {
  if (!refreshRequest) {
    refreshRequest = apiRequest<AccessTokenResponse>("/auth/token/refresh/", {
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

export const getProfile = (accessToken: string) =>
  apiRequest<User>("/me/", { accessToken });
