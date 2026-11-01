import { useMemo } from "react";

import { useColors, useIsMobile } from "@package/ui";

import { DEFAULT_MEAL_TYPES } from "./types";
import { getStartOfWeek, WeekCalendar } from "./week-calendar";

export const Plan = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const weekStart = useMemo(() => getStartOfWeek(new Date()), []);

  return (
    <main
      css={{
        width: "100%",
        maxWidth: 1200,
        boxSizing: "border-box",
        margin: "0 auto",
        padding: isMobile ? "20px 16px" : "32px 24px",
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
