import type { AuthenticatedRequest } from "@package/auth";
import type { MealSource } from "@package/meals";

import type { MealType } from "./types";

export type PlanSettings = {
  id: number;
  enabled_meal_types: MealType[];
  created_at: string;
  updated_at: string;
};

export type UpdatePlanSettingsInput = {
  enabled_meal_types: MealType[];
};

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

export type CreatePlanItemInput = {
  date: string;
  meal_type: MealType;
  meal_id: number;
  servings?: number;
  note?: string;
};

export type UpdatePlanItemInput = Partial<CreatePlanItemInput>;

export const getPlanSettings = (request: AuthenticatedRequest) =>
  request<PlanSettings>("/plan/");

export const updatePlanSettings = (
  request: AuthenticatedRequest,
  input: UpdatePlanSettingsInput
) =>
  request<PlanSettings>("/plan/", {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getPlanItems = (
  request: AuthenticatedRequest,
  { dateFrom, dateTo }: PlanItemRange
) => {
  const query = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
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
