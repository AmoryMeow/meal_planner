import type { RequiredFields } from "@package/api";
import type {
  PatchedPlanItemRequest,
  PatchedPlanRequest,
  Plan as GeneratedPlan,
  PlanItem as GeneratedPlanItem,
  PlanItemRequest,
} from "@package/api/generated/schema";
import type { AuthenticatedRequest } from "@package/auth";

export type MealPlan = RequiredFields<GeneratedPlan, "name" | "color">;
export type PlanItem = RequiredFields<
  GeneratedPlanItem,
  "plan_id" | "servings" | "note"
>;

export type PlanItemRange = {
  dateFrom: string;
  dateTo: string;
};

export type PlanItemQuery = PlanItemRange & {
  planIds: number[];
};

export type {
  MealSnapshot,
  PatchedPlanItemRequest as UpdatePlanItemInput,
  PatchedPlanRequest as UpdatePlanInput,
  PlanItemRequest as CreatePlanItemInput,
  ScopeEnum as PlanScope,
} from "@package/api/generated/schema";

export const getPlans = (request: AuthenticatedRequest) =>
  request<MealPlan[]>("/plans/");

export const getPlan = (request: AuthenticatedRequest, planId: number) =>
  request<MealPlan>(`/plans/${planId}/`);

export const updatePlan = (
  request: AuthenticatedRequest,
  planId: number,
  input: PatchedPlanRequest
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

export const createPlanItem = (request: AuthenticatedRequest, input: PlanItemRequest) =>
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
  input: PatchedPlanItemRequest
) =>
  request<PlanItem>(`/plan-items/${planItemId}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
