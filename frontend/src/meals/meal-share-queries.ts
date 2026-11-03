import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";

import {
  createMealShare,
  deleteMealShare,
  getMealShares,
  updateMealShare,
  type CreateMealShareInput,
  type MealShare,
  type UpdateMealShareInput,
} from "./api";

export const mealShareQueryKeys = {
  all: ["meal-shares"] as const,
  byUser: (userId: number | null) => [...mealShareQueryKeys.all, userId] as const,
  byMeal: (userId: number | null, mealId: number) =>
    [...mealShareQueryKeys.byUser(userId), mealId] as const,
};

export const useMealSharesQuery = (mealId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealShareQueryKeys.byMeal(user?.id ?? null, mealId),
    queryFn: () => getMealShares(request, mealId),
    enabled: Boolean(user && mealId),
  });
};

export const useCreateMealShareMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = mealShareQueryKeys.byMeal(user?.id ?? null, mealId);

  const mutation = useMutation({
    mutationFn: (input: CreateMealShareInput) =>
      createMealShare(request, mealId, input),
    onSuccess: share => {
      queryClient.setQueryData<MealShare[]>(
        queryKey,
        (current: MealShare[] | undefined) =>
          current
            ? [...current, share].sort((first, second) =>
                first.group_name.localeCompare(second.group_name)
              )
            : current
      );
    },
  });

  return { ...mutation, submitError: getMealShareError(mutation.error) };
};

type UpdateMealShareVariables = {
  shareId: number;
  input: UpdateMealShareInput;
};

export const useUpdateMealShareMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = mealShareQueryKeys.byMeal(user?.id ?? null, mealId);

  const mutation = useMutation({
    mutationFn: ({ shareId, input }: UpdateMealShareVariables) =>
      updateMealShare(request, mealId, shareId, input),
    onSuccess: updatedShare => {
      queryClient.setQueryData<MealShare[]>(
        queryKey,
        (current: MealShare[] | undefined) =>
          current?.map(share => (share.id === updatedShare.id ? updatedShare : share))
      );
    },
  });

  return { ...mutation, submitError: getMealShareError(mutation.error) };
};

export const useDeleteMealShareMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const queryKey = mealShareQueryKeys.byMeal(user?.id ?? null, mealId);

  const mutation = useMutation({
    mutationFn: (shareId: number) => deleteMealShare(request, mealId, shareId),
    onSuccess: (_response, shareId) => {
      queryClient.setQueryData<MealShare[]>(
        queryKey,
        (current: MealShare[] | undefined) =>
          current?.filter(share => share.id !== shareId)
      );
    },
  });

  return { ...mutation, submitError: getMealShareError(mutation.error) };
};

const getMealShareError = (error: Error | null): string => {
  if (!error) return "";
  if (!(error instanceof ApiError)) {
    return "Unable to connect to the server. Please try again.";
  }
  return (
    getFirstError(error.body?.group_id) ||
    getFirstError(error.body?.access) ||
    error.message
  );
};

const getFirstError = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};
