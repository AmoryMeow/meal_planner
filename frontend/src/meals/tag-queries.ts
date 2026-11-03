import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthSession } from "@package/auth";

import {
  createMealCatalogTag,
  createTag,
  getMealTagCatalog,
  getMealTagFilterOptions,
  getTagCatalog,
} from "./api";
import { mealQueryKeys } from "./queries";

export const tagQueryKeys = {
  all: ["meal-tags"] as const,
  byUser: (userId: number | null) => [...tagQueryKeys.all, userId] as const,
  catalog: (userId: number | null, search: string) =>
    [...tagQueryKeys.byUser(userId), "catalog", search] as const,
  mealCatalog: (userId: number | null, mealId: number, search: string) =>
    [...tagQueryKeys.byUser(userId), "meal-catalog", mealId, search] as const,
  filterOptions: (userId: number | null, search: string) =>
    [...tagQueryKeys.byUser(userId), "filter-options", search] as const,
};

export const useTagSearchQuery = (search = "") => {
  const { request, user } = useAuthSession();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: tagQueryKeys.catalog(user?.id ?? null, normalizedSearch),
    queryFn: () => getTagCatalog(request, normalizedSearch),
    enabled: Boolean(user),
  });
};

export const useMealTagSearchQuery = (mealId: number, search = "") => {
  const { request, user } = useAuthSession();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: tagQueryKeys.mealCatalog(user?.id ?? null, mealId, normalizedSearch),
    queryFn: () => getMealTagCatalog(request, mealId, normalizedSearch),
    enabled: Boolean(user && mealId),
  });
};

export const useMealTagFilterOptionsQuery = (search = "") => {
  const { request, user } = useAuthSession();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: tagQueryKeys.filterOptions(user?.id ?? null, normalizedSearch),
    queryFn: () => getMealTagFilterOptions(request, normalizedSearch),
    enabled: Boolean(user),
  });
};

export const useCreateTagMutation = (mealId?: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: (name: string) =>
      mealId ? createMealCatalogTag(request, mealId, name) : createTag(request, name),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tagQueryKeys.byUser(userId) }),
        queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) }),
      ]);
    },
  });
};
