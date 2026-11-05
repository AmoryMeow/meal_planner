import type { MealTypeEnum } from "@package/api/generated/schema";

export type { MealTypeEnum as MealType } from "@package/api/generated/schema";
export type PlanColorMap = ReadonlyMap<number, string>;

export type CalendarView = "week" | "month";

export const DEFAULT_MEAL_TYPES: readonly MealTypeEnum[] = [
  "breakfast",
  "lunch",
  "dinner",
];
