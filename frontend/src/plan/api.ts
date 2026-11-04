import type { AuthenticatedRequest } from "@package/auth";
import type { MealSource } from "@package/meals";

import type { MealType } from "./types";

export type PlanScope = "personal" | "group";

export type MealPlan = {
  id: number;
  scope: PlanScope;
  group_id: number | null;
  can_manage: boolean;
  name: string;
  color: string;
  enabled_meal_types: MealType[];
  created_at: string;
  updated_at: string;
};

export type UpdatePlanInput = Partial<
  Pick<MealPlan, "name" | "color" | "enabled_meal_types">
>;

export type MealSnapshotIngredient = {
  ingredient_id: number;
  name: string;
  quantity: string;
  unit: string;
};

export type MealSnapshot = {
  meal_id: number;
  name: string;
  source: MealSource;
  servings: number;
  tags: string[];
  ingredients: MealSnapshotIngredient[];
};

export type PlanItem = {
  id: number;
  plan_id: number;
  date: string;
  meal_type: MealType;
  meal_id: number;
  servings: number;
  note: string;
  meal_snapshot: MealSnapshot;
  created_at: string;
  updated_at: string;
};

export type PlanItemRange = {
  dateFrom: string;
  dateTo: string;
};

export type PlanItemQuery = PlanItemRange & {
  planIds: number[];
};

export type CreatePlanItemInput = {
  plan_id?: number;
  date: string;
  meal_type: MealType;
  meal_id: number;
  share_with_group?: boolean;
  servings?: number;
  note?: string;
};

export type UpdatePlanItemInput = Partial<Omit<CreatePlanItemInput, "plan_id">>;

export const getPlans = (request: AuthenticatedRequest) =>
  request<MealPlan[]>("/plans/");

export const getPlan = (request: AuthenticatedRequest, planId: number) =>
  request<MealPlan>(`/plans/${planId}/`);

export const updatePlan = (
  request: AuthenticatedRequest,
  planId: number,
  input: UpdatePlanInput
) =>
  request<MealPlan>(`/plans/${planId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getPlanItems = (
  request: AuthenticatedRequest,
  { dateFrom, dateTo, planIds }: PlanItemQuery
) => {
  const query = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    plan_ids: planIds.join(","),
  });

  return request<PlanItem[]>(`/plan-items/?${query.toString()}`);
};

export const createPlanItem = (
  request: AuthenticatedRequest,
  input: CreatePlanItemInput
) =>
  request<PlanItem>("/plan-items/", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const removePlanItem = (request: AuthenticatedRequest, planItemId: number) =>
  request<void>(`/plan-items/${planItemId}/`, {
    method: "DELETE",
  });

export const updatePlanItem = (
  request: AuthenticatedRequest,
  planItemId: number,
  input: UpdatePlanItemInput
) =>
  request<PlanItem>(`/plan-items/${planItemId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
