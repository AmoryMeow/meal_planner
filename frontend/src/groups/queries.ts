import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";
import { planQueryKeys } from "@package/plan";

import { createGroup, type CreateGroupInput } from "./api";

export const useCreateGroupMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreateGroupInput) => createGroup(request, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: planQueryKeys.list(userId) }),
  });
  const apiFieldErrors = getGroupApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getGroupSubmitError(mutation.error, apiFieldErrors),
  };
};

type GroupApiFieldErrors = Partial<Record<keyof CreateGroupInput, string>>;

const getGroupApiFieldErrors = (error: Error | null): GroupApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    name: getFirstError(error.body?.name),
    color: getFirstError(error.body?.color),
  };
};

const getGroupSubmitError = (
  error: Error | null,
  apiFieldErrors: GroupApiFieldErrors
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
