import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";

import {
  createIngredient,
  createMealIngredient,
  deleteMealIngredient,
  getIngredient,
  getIngredientCatalog,
  getMealIngredient,
  getMealIngredients,
  updateIngredient,
  updateMealIngredient,
  type CreateIngredientInput,
  type CreateMealIngredientInput,
  type UpdateIngredientInput,
  type UpdateMealIngredientInput,
} from "./api";
import { mealQueryKeys } from "./queries";

export const ingredientCatalogQueryKeys = {
  all: ["ingredient-catalog"] as const,
  byUser: (userId: number | null) =>
    [...ingredientCatalogQueryKeys.all, userId] as const,
  searches: (userId: number | null) =>
    [...ingredientCatalogQueryKeys.byUser(userId), "search"] as const,
  search: (userId: number | null, search: string) =>
    [...ingredientCatalogQueryKeys.searches(userId), search] as const,
  detail: (userId: number | null, ingredientId: number) =>
    [...ingredientCatalogQueryKeys.byUser(userId), "detail", ingredientId] as const,
};

export const mealIngredientQueryKeys = {
  all: ["meal-ingredients"] as const,
  byUser: (userId: number | null) => [...mealIngredientQueryKeys.all, userId] as const,
  byMeal: (userId: number | null, mealId: number) =>
    [...mealIngredientQueryKeys.byUser(userId), mealId] as const,
  list: (userId: number | null, mealId: number) =>
    [...mealIngredientQueryKeys.byMeal(userId, mealId), "list"] as const,
  detail: (userId: number | null, mealId: number, mealIngredientId: number) =>
    [
      ...mealIngredientQueryKeys.byMeal(userId, mealId),
      "detail",
      mealIngredientId,
    ] as const,
};

export const useIngredientSearchQuery = (search = "") => {
  const { request, user } = useAuthSession();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: ingredientCatalogQueryKeys.search(user?.id ?? null, normalizedSearch),
    queryFn: () => getIngredientCatalog(request, normalizedSearch),
    enabled: Boolean(user),
  });
};

export const useIngredientQuery = (ingredientId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: ingredientCatalogQueryKeys.detail(user?.id ?? null, ingredientId),
    queryFn: () => getIngredient(request, ingredientId),
    enabled: Boolean(user),
  });
};

export const useCreateIngredientMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreateIngredientInput) => createIngredient(request, input),
    onSuccess: ingredient => {
      queryClient.setQueryData(
        ingredientCatalogQueryKeys.detail(userId, ingredient.id),
        ingredient
      );
      return invalidateIngredientCatalogSearches(queryClient, userId);
    },
  });
  const apiFieldErrors = getApiFieldErrors<CreateIngredientInput>(mutation.error, [
    "name",
  ]);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

type UpdateIngredientVariables = {
  ingredientId: number;
  input: UpdateIngredientInput;
};

export const useUpdateIngredientMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ ingredientId, input }: UpdateIngredientVariables) =>
      updateIngredient(request, ingredientId, input),
    onSuccess: ingredient => {
      queryClient.setQueryData(
        ingredientCatalogQueryKeys.detail(userId, ingredient.id),
        ingredient
      );
      return invalidateIngredientUsages(queryClient, userId);
    },
  });
  const apiFieldErrors = getApiFieldErrors<CreateIngredientInput>(mutation.error, [
    "name",
  ]);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useMealIngredientsQuery = (mealId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealIngredientQueryKeys.list(user?.id ?? null, mealId),
    queryFn: () => getMealIngredients(request, mealId),
    enabled: Boolean(user),
  });
};

export const useMealIngredientQuery = (mealId: number, mealIngredientId: number) => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: mealIngredientQueryKeys.detail(
      user?.id ?? null,
      mealId,
      mealIngredientId
    ),
    queryFn: () => getMealIngredient(request, mealId, mealIngredientId),
    enabled: Boolean(user),
  });
};

export const useCreateMealIngredientMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: CreateMealIngredientInput) =>
      createMealIngredient(request, mealId, input),
    onSuccess: mealIngredient => {
      queryClient.setQueryData(
        mealIngredientQueryKeys.detail(userId, mealId, mealIngredient.id),
        mealIngredient
      );
      return invalidateMealIngredientCaches(queryClient, userId, mealId);
    },
  });
  const apiFieldErrors = getMealIngredientApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

type UpdateMealIngredientVariables = {
  mealIngredientId: number;
  input: UpdateMealIngredientInput;
};

export const useUpdateMealIngredientMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ mealIngredientId, input }: UpdateMealIngredientVariables) =>
      updateMealIngredient(request, mealId, mealIngredientId, input),
    onSuccess: mealIngredient => {
      queryClient.setQueryData(
        mealIngredientQueryKeys.detail(userId, mealId, mealIngredient.id),
        mealIngredient
      );
      return invalidateMealIngredientCaches(queryClient, userId, mealId);
    },
  });
  const apiFieldErrors = getMealIngredientApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useDeleteMealIngredientMutation = (mealId: number) => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (mealIngredientId: number) =>
      deleteMealIngredient(request, mealId, mealIngredientId),
    onSuccess: (_data, mealIngredientId) => {
      queryClient.removeQueries({
        queryKey: mealIngredientQueryKeys.detail(userId, mealId, mealIngredientId),
      });
      return invalidateMealIngredientCaches(queryClient, userId, mealId);
    },
  });

  return {
    ...mutation,
    submitError: getSubmitError(mutation.error, {}),
  };
};

const invalidateMealIngredientCaches = async (
  queryClient: QueryClient,
  userId: number | null,
  mealId: number
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: mealIngredientQueryKeys.list(userId, mealId),
    }),
    queryClient.invalidateQueries({
      queryKey: mealQueryKeys.detail(userId, mealId),
    }),
    queryClient.invalidateQueries({ queryKey: mealQueryKeys.lists(userId) }),
  ]);
};

const invalidateIngredientCatalogSearches = (
  queryClient: QueryClient,
  userId: number | null
) =>
  queryClient.invalidateQueries({
    queryKey: ingredientCatalogQueryKeys.searches(userId),
  });

const invalidateIngredientUsages = async (
  queryClient: QueryClient,
  userId: number | null
): Promise<void> => {
  await Promise.all([
    invalidateIngredientCatalogSearches(queryClient, userId),
    queryClient.invalidateQueries({
      queryKey: mealIngredientQueryKeys.byUser(userId),
    }),
    queryClient.invalidateQueries({ queryKey: mealQueryKeys.byUser(userId) }),
  ]);
};

type ApiFieldErrors<T> = Partial<Record<keyof T, string>>;

const getMealIngredientApiFieldErrors = (
  error: Error | null
): ApiFieldErrors<CreateMealIngredientInput> =>
  getApiFieldErrors<CreateMealIngredientInput>(error, [
    "ingredient_id",
    "quantity",
    "unit",
  ]);

const getApiFieldErrors = <T extends object>(
  error: Error | null,
  fields: (keyof T)[]
): ApiFieldErrors<T> => {
  if (!(error instanceof ApiError)) return {};

  return Object.fromEntries(
    fields.map(field => [field, getFirstError(error.body?.[field as string])])
  ) as ApiFieldErrors<T>;
};

const getSubmitError = (
  error: Error | null,
  apiFieldErrors: Record<string, string | undefined>
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
