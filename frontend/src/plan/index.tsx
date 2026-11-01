import { useMemo } from "react";

import { getContentContainerStyles, useColors, useIsMobile } from "@package/ui";

import { DEFAULT_MEAL_TYPES } from "./types";
import { getStartOfWeek, WeekCalendar } from "./week-calendar";

export {
  createPlanItem,
  getPlanItems,
  type CreatePlanItemInput,
  type MealSnapshot,
  type MealSnapshotIngredient,
  type PlanItem,
  type PlanItemRange,
} from "./api";
export {
  planItemQueryKeys,
  useCreatePlanItemMutation,
  usePlanItemsQuery,
} from "./queries";
export { type MealType } from "./types";

export const Plan = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const weekStart = useMemo(() => getStartOfWeek(new Date()), []);

  return (
    <main
      css={{
        ...getContentContainerStyles(isMobile),
        paddingTop: isMobile ? 20 : 32,
        paddingBottom: isMobile
          ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
          : "48px",
      }}
    >
      <header css={{ marginBottom: 16 }}>
        <h1
          css={{
            margin: 0,
            color: colors.textPrimary,
            fontSize: 24,
            lineHeight: 1.25,
          }}
        >
          Meal plan
        </h1>
      </header>

      <WeekCalendar
        weekStart={weekStart}
        mealTypes={DEFAULT_MEAL_TYPES}
        isMobile={isMobile}
      />
    </main>
  );
};
