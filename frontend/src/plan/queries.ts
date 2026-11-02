import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@package/api";
import { useAuthSession } from "@package/auth";

import {
  createPlanItem,
  getPlanItems,
  getPlanSettings,
  removePlanItem,
  updatePlanItem,
  updatePlanSettings,
  type CreatePlanItemInput,
  type PlanItem,
  type PlanItemRange,
  type PlanSettings,
  type UpdatePlanSettingsInput,
  type UpdatePlanItemInput,
} from "./api";

export const planSettingsQueryKeys = {
  all: ["plan-settings"] as const,
  byUser: (userId: number | null) => [...planSettingsQueryKeys.all, userId] as const,
};

export const usePlanSettingsQuery = () => {
  const { request, user } = useAuthSession();

  return useQuery({
    queryKey: planSettingsQueryKeys.byUser(user?.id ?? null),
    queryFn: () => getPlanSettings(request),
    enabled: Boolean(user),
  });
};

export const useUpdatePlanSettingsMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (input: UpdatePlanSettingsInput) => updatePlanSettings(request, input),
    onSuccess: settings =>
      queryClient.setQueryData<PlanSettings>(
        planSettingsQueryKeys.byUser(userId),
        settings
      ),
  });
  const apiFieldErrors = getPlanSettingsApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

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
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

export const useRemovePlanItemMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: (planItemId: number) => removePlanItem(request, planItemId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      }),
  });

  return {
    ...mutation,
    submitError: getSubmitError(mutation.error, {}),
  };
};

type UpdatePlanItemVariables = {
  planItemId: number;
  input: UpdatePlanItemInput;
  optimisticPlanItem?: PlanItem;
};

type UpdatePlanItemContext = {
  previousRanges: [QueryKey, PlanItem[] | undefined][];
};

export const useUpdatePlanItemMutation = () => {
  const { request, user } = useAuthSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useMutation({
    mutationFn: ({ planItemId, input }: UpdatePlanItemVariables) =>
      updatePlanItem(request, planItemId, input),
    onMutate: ({ input, optimisticPlanItem }) => {
      if (!optimisticPlanItem) return undefined;

      const rangesKey = planItemQueryKeys.ranges(userId);
      void queryClient.cancelQueries({ queryKey: rangesKey });
      const previousRanges = queryClient.getQueriesData<PlanItem[]>({
        queryKey: rangesKey,
      });
      const updatedPlanItem = getOptimisticPlanItem(optimisticPlanItem, input);

      previousRanges.forEach(([queryKey, items]) => {
        if (!items) return;

        const dateFrom = queryKey[3];
        const dateTo = queryKey[4];
        if (typeof dateFrom !== "string" || typeof dateTo !== "string") return;

        const nextItems = items.filter(item => item.id !== updatedPlanItem.id);
        if (updatedPlanItem.date >= dateFrom && updatedPlanItem.date <= dateTo) {
          nextItems.push(updatedPlanItem);
          nextItems.sort(comparePlanItems);
        }
        queryClient.setQueryData(queryKey, nextItems);
      });

      return { previousRanges } satisfies UpdatePlanItemContext;
    },
    onError: (_error, _variables, context) => {
      context?.previousRanges.forEach(([queryKey, items]) => {
        queryClient.setQueryData(queryKey, items);
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: planItemQueryKeys.ranges(userId),
      }),
  });
  const apiFieldErrors = getPlanItemApiFieldErrors(mutation.error);

  return {
    ...mutation,
    apiFieldErrors,
    submitError: getSubmitError(mutation.error, apiFieldErrors),
  };
};

const getOptimisticPlanItem = (
  planItem: PlanItem,
  input: UpdatePlanItemInput
): PlanItem => ({
  ...planItem,
  date: input.date ?? planItem.date,
  meal_type: input.meal_type ?? planItem.meal_type,
  meal_id: input.meal_id ?? planItem.meal_id,
  servings: input.servings ?? planItem.servings,
  note: input.note ?? planItem.note,
});

const mealTypeOrder = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
} as const;

const comparePlanItems = (first: PlanItem, second: PlanItem): number =>
  first.date.localeCompare(second.date) ||
  mealTypeOrder[first.meal_type] - mealTypeOrder[second.meal_type] ||
  first.id - second.id;

type PlanItemApiFieldErrors = Partial<Record<keyof CreatePlanItemInput, string>>;
type PlanSettingsApiFieldErrors = Partial<
  Record<keyof UpdatePlanSettingsInput, string>
>;

const getPlanSettingsApiFieldErrors = (
  error: Error | null
): PlanSettingsApiFieldErrors => {
  if (!(error instanceof ApiError)) return {};

  return {
    enabled_meal_types: getFirstError(error.body?.enabled_meal_types),
  };
};

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
