import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthSession } from "@package/auth";

import {
  createMeal,
  deleteMeal,
  getMeal,
  getMeals,
  updateMeal,
  type CreateMealInput,
  type UpdateMealInput,
} from "./api";

export const mealQueryKeys = {
  all: ["meals"] as const,
  byUser: (userId: number | null) => [...mealQueryKeys.all, userId] as const,
  lists: (userId: number | null) => [...mealQueryKeys.byUser(userId), "list"] as const,
  detail: (userId: number | null, mealId: number) =>
    [...mealQueryKeys.byUser(userId), "detail", mealId] as const,
};

export const useMealsQuery = () => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealQueryKeys.lists(user?.id ?? null),
    queryFn: () => getMeals(request),
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

  return useMutation({
    mutationFn: (input: CreateMealInput) => createMeal(request, input),
    onSuccess: meal => {
      queryClient.setQueryData(mealQueryKeys.detail(userId, meal.id), meal);
      return queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) });
    },
  });
};

type UpdateMealVariables = {
  mealId: number;
  input: UpdateMealInput;
};

export const useUpdateMealMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: ({ mealId, input }: UpdateMealVariables) =>
      updateMeal(request, mealId, input),
    onSuccess: meal => {
      queryClient.setQueryData(mealQueryKeys.detail(userId, meal.id), meal);
      return queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) });
    },
  });
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
