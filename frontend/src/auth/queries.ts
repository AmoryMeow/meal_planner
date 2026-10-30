import { useMutation, useQuery } from "@tanstack/react-query";

import { ApiError } from "@package/api";

import {
  getProfile,
  login,
  refreshToken,
  register,
  type RegistrationInput,
} from "./api";

type RegistrationApiFieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export const authQueryKeys = {
  all: ["auth"] as const,
  profile: () => [...authQueryKeys.all, "profile"] as const,
};

export const useRegistrationMutation = () => {
  const mutation = useMutation({ mutationFn: register });
  const apiFieldErrors = getRegistrationApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useLoginMutation = () => useMutation({ mutationFn: login });

export const useRefreshTokenMutation = () => useMutation({ mutationFn: refreshToken });

export const useProfileQuery = (accessToken: string | null) =>
  useQuery({
    queryKey: authQueryKeys.profile(),
    queryFn: () => getProfile(accessToken as string),
    enabled: Boolean(accessToken),
    retry: false,
  });

const getRegistrationApiFieldErrors = (
  error: Error | null
): RegistrationApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    first_name: getFirstError(error.body?.first_name),
    last_name: getFirstError(error.body?.last_name),
    email: getFirstError(error.body?.email),
    password: getFirstError(error.body?.password),
    password_confirm: getFirstError(error.body?.password_confirm),
  };
};

const getSubmitError = (
  error: Error | null,
  apiFieldErrors: RegistrationApiFieldErrors
): string => {
  if (!error || Object.values(apiFieldErrors).some(Boolean)) return "";
  if (error instanceof ApiError) return error.message;
  return "Unable to connect to the server. Please try again.";
};

const getFirstError = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};
