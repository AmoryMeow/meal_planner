import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";

import {
  createMeal,
  deleteMeal,
  getMeal,
  getMeals,
  updateMeal,
  type CreateMealInput,
  type MealFilters,
  type UpdateMealInput,
} from "./api";

export const mealQueryKeys = {
  all: ["meals"] as const,
  byUser: (userId: number | null) => [...mealQueryKeys.all, userId] as const,
  lists: (userId: number | null) => [...mealQueryKeys.byUser(userId), "list"] as const,
  list: (userId: number | null, filters: MealFilters) =>
    [...mealQueryKeys.lists(userId), filters] as const,
  detail: (userId: number | null, mealId: number) =>
    [...mealQueryKeys.byUser(userId), "detail", mealId] as const,
};

export const useMealsQuery = (filters: MealFilters = {}) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealQueryKeys.list(user?.id ?? null, filters),
    queryFn: () => getMeals(request, filters),
    enabled: Boolean(user),
  });
};

export const useMealQuery = (mealId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealQueryKeys.detail(user?.id ?? null, mealId),
    queryFn: () => getMeal(request, mealId),
    enabled: Boolean(user),
  });
};

export const useCreateMealMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreateMealInput) => createMeal(request, input),
    onSuccess: meal => {
      queryClient.setQueryData(mealQueryKeys.detail(userId, meal.id), meal);
      return queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) });
    },
  });
  const apiFieldErrors = getMealApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getMealSubmitError(mutation.error, apiFieldErrors),
  };
};

type UpdateMealVariables = {
  mealId: number;
  input: UpdateMealInput;
};

export const useUpdateMealMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ mealId, input }: UpdateMealVariables) =>
      updateMeal(request, mealId, input),
    onSuccess: meal => {
      queryClient.setQueryData(mealQueryKeys.detail(userId, meal.id), meal);
      return queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) });
    },
  });
  const apiFieldErrors = getMealApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getMealSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useDeleteMealMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: (mealId: number) => deleteMeal(request, mealId),
    onSuccess: (_data, mealId) => {
      queryClient.removeQueries({
        queryKey: mealQueryKeys.detail(userId, mealId),
      });
      return queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) });
    },
  });
};

type MealApiFieldErrors = Partial<Record<keyof CreateMealInput, string>>;

const getMealApiFieldErrors = (error: Error | null): MealApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    name: getFirstError(error.body?.name),
    source: getFirstError(error.body?.source),
    tag_ids: getFirstError(error.body?.tag_ids),
    instructions: getFirstError(error.body?.instructions),
  };
};

const getMealSubmitError = (
  error: Error | null,
  apiFieldErrors: MealApiFieldErrors
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
