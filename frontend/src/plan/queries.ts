import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";

import {
  createPlanItem,
  deletePlanItem,
  getPlanItems,
  updatePlanItem,
  type CreatePlanItemInput,
  type PlanItemRange,
  type UpdatePlanItemInput,
} from "./api";

export const planItemQueryKeys = {
  all: ["plan-items"] as const,
  byUser: (userId: number | null) => [...planItemQueryKeys.all, userId] as const,
  ranges: (userId: number | null) =>
    [...planItemQueryKeys.byUser(userId), "range"] as const,
  range: (userId: number | null, { dateFrom, dateTo }: PlanItemRange) =>
    [...planItemQueryKeys.ranges(userId), dateFrom, dateTo] as const,
};

export const usePlanItemsQuery = (range: PlanItemRange) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: planItemQueryKeys.range(user?.id ?? null, range),
    queryFn: () => getPlanItems(request, range),
    enabled: Boolean(user && range.dateFrom && range.dateTo),
  });
};

export const useCreatePlanItemMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreatePlanItemInput) => createPlanItem(request, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      }),
  });
  const apiFieldErrors = getPlanItemApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getPlanItemSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useDeletePlanItemMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (planItemId: number) => deletePlanItem(request, planItemId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      }),
  });

  return {
    ...mutation,
    submitError: getPlanItemSubmitError(mutation.error, {}),
  };
};

type UpdatePlanItemVariables = {
  planItemId: number;
  input: UpdatePlanItemInput;
};

export const useUpdatePlanItemMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ planItemId, input }: UpdatePlanItemVariables) =>
      updatePlanItem(request, planItemId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      }),
  });
  const apiFieldErrors = getPlanItemApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getPlanItemSubmitError(mutation.error, apiFieldErrors),
  };
};

type PlanItemApiFieldErrors = Partial<Record<keyof CreatePlanItemInput, string>>;

const getPlanItemApiFieldErrors = (error: Error | null): PlanItemApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    date: getFirstError(error.body?.date),
    meal_type: getFirstError(error.body?.meal_type),
    meal_id: getFirstError(error.body?.meal_id),
    servings: getFirstError(error.body?.servings),
    note: getFirstError(error.body?.note),
  };
};

const getPlanItemSubmitError = (
  error: Error | null,
  apiFieldErrors: PlanItemApiFieldErrors
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
