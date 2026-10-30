import { apiRequest } from "@package/api";

export type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type RegistrationResponse = AuthTokens & {
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

export type RefreshTokenInput = {
  refresh: string;
};

export const register = (input: RegistrationInput) =>
  apiRequest<RegistrationResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const login = (input: LoginInput) =>
  apiRequest<AuthTokens>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const refreshToken = (input: RefreshTokenInput) =>
  apiRequest<AuthTokens>("/auth/token/refresh/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getProfile = (accessToken: string) =>
  apiRequest<User>("/me/", { accessToken });
