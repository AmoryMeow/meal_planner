export type MealType = "breakfast" | "lunch" | "dinner";
export type PlanColorMap = ReadonlyMap<number, string>;

export type CalendarView = "week" | "month";

export const DEFAULT_MEAL_TYPES: readonly MealType[] = ["breakfast", "lunch", "dinner"];
