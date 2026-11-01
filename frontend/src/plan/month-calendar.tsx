import { useState } from "react";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { getDateKey, getMonthGridDays, isSameDay } from "./date-utils";
import { type MealType } from "./types";

type MonthCalendarProps = {
  monthStart: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  isMobile: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const shortMealTypeLabels: Record<MealType, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
};

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayDates = Array.from(
  { length: 7 },
  (_, index) => new Date(2024, 0, index + 1)
);

export const MonthCalendar = ({
  monthStart,
  mealTypes,
  planItems,
  isMobile,
  onAddMeal,
  onEditPlanItem,
}: MonthCalendarProps) => {
  const colors = useColors();

  if (mealTypes.length === 0) {
    return (
      <p
        role="status"
        css={{
          margin: 0,
          padding: 16,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          background: colors.surface,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        Enable at least one meal section in plan settings.
      </p>
    );
  }

  return isMobile ? (
    <MobileMonthCalendar
      key={getDateKey(monthStart)}
      monthStart={monthStart}
      mealTypes={mealTypes}
      planItems={planItems}
      onAddMeal={onAddMeal}
      onEditPlanItem={onEditPlanItem}
    />
  ) : (
    <DesktopMonthCalendar
      monthStart={monthStart}
      mealTypes={mealTypes}
      planItems={planItems}
      onAddMeal={onAddMeal}
      onEditPlanItem={onEditPlanItem}
    />
  );
};

const DesktopMonthCalendar = ({
  monthStart,
  mealTypes,
  planItems,
  onAddMeal,
  onEditPlanItem,
}: Omit<MonthCalendarProps, "isMobile">) => {
  const colors = useColors();
  const days = getMonthGridDays(monthStart);
  const defaultMealType = mealTypes[0];

  return (
    <section aria-label="Monthly meal plan">
      <div css={{ overflowX: "auto", padding: "3px 3px 8px" }}>
        <div css={{ minWidth: 980 }}>
          <div
            aria-hidden="true"
            css={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 6,
              marginBottom: 6,
            }}
          >
            {weekdayDates.map(day => (
              <div
                key={day.toISOString()}
                css={{
                  padding: "5px 8px",
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {weekdayFormatter.format(day)}
              </div>
            ))}
          </div>

          <div
            css={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 6,
            }}
          >
            {days.map(day => {
              const dateKey = getDateKey(day);
              const dayPlanItems = planItems.filter(item => item.date === dateKey);
              const isCurrentMonth = day.getMonth() === monthStart.getMonth();
              const isToday = isSameDay(day, new Date());

              return (
                <article
                  key={dateKey}
                  aria-label={fullDateFormatter.format(day)}
                  css={{
                    display: "flex",
                    minHeight: 138,
                    minWidth: 0,
                    flexDirection: "column",
                    gap: 6,
                    padding: 7,
                    border: `1px solid ${
                      isToday
                        ? colors.primary
                        : isCurrentMonth
                          ? colors.border
                          : colors.divider
                    }`,
                    borderRadius: 10,
                    background: colors.surface,
                  }}
                >
                  <div
                    css={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                    }}
                  >
                    <strong
                      css={{
                        color: isToday
                          ? colors.primary
                          : isCurrentMonth
                            ? colors.textPrimary
                            : colors.textMuted,
                        fontSize: 12,
                      }}
                    >
                      {day.getDate()}
                    </strong>
                    {isToday ? (
                      <span
                        css={{ color: colors.primary, fontSize: 9, fontWeight: 700 }}
                      >
                        Today
                      </span>
                    ) : null}
                  </div>

                  {dayPlanItems.length > 0 ? (
                    <ul
                      css={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        margin: 0,
                        padding: 0,
                        listStyle: "none",
                      }}
                    >
                      {dayPlanItems.map(planItem => (
                        <li key={planItem.id}>
                          <MonthPlanItem
                            planItem={planItem}
                            onEdit={() => onEditPlanItem(planItem)}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {defaultMealType ? (
                    <div css={{ marginTop: "auto" }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        ariaLabel={`Add meal on ${fullDateFormatter.format(day)}`}
                        onClick={() => onAddMeal(day, defaultMealType)}
                      >
                        + Add
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const MobileMonthCalendar = ({
  monthStart,
  mealTypes,
  planItems,
  onAddMeal,
  onEditPlanItem,
}: Omit<MonthCalendarProps, "isMobile">) => {
  const colors = useColors();
  const days = getMonthGridDays(monthStart);
  const today = new Date();
  const todayIsInMonth =
    today.getFullYear() === monthStart.getFullYear() &&
    today.getMonth() === monthStart.getMonth();
  const [selectedDate, setSelectedDate] = useState(todayIsInMonth ? today : monthStart);
  const selectedDateKey = getDateKey(selectedDate);
  const selectedPlanItems = planItems.filter(item => item.date === selectedDateKey);

  return (
    <section aria-label="Monthly meal plan">
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 3,
          marginBottom: 4,
        }}
      >
        {weekdayDates.map(day => (
          <div
            key={day.toISOString()}
            aria-hidden="true"
            css={{
              padding: "3px 0",
              color: colors.textSecondary,
              fontSize: 10,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {weekdayFormatter.format(day).slice(0, 2)}
          </div>
        ))}
      </div>

      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 3,
          marginBottom: 14,
        }}
      >
        {days.map(day => {
          const dateKey = getDateKey(day);
          const isCurrentMonth = day.getMonth() === monthStart.getMonth();
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const itemCount = planItems.filter(item => item.date === dateKey).length;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!isCurrentMonth}
              aria-label={fullDateFormatter.format(day)}
              aria-pressed={isSelected}
              onClick={() => setSelectedDate(day)}
              css={{
                display: "flex",
                minHeight: 46,
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: 3,
                border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                borderRadius: 8,
                background: isSelected
                  ? hexToRgba(colors.primary, 0.12)
                  : colors.surface,
                color: isToday ? colors.primary : colors.textPrimary,
                font: "inherit",
                fontSize: 12,
                fontWeight: isToday || isSelected ? 700 : 500,
                cursor: isCurrentMonth ? "pointer" : "default",
                visibility: isCurrentMonth ? "visible" : "hidden",
                "&:focus-visible": {
                  outline: `2px solid ${colors.focus}`,
                  outlineOffset: 1,
                },
              }}
            >
              <span>{day.getDate()}</span>
              {itemCount > 0 ? (
                <span
                  aria-hidden="true"
                  css={{
                    minWidth: 14,
                    padding: "1px 3px",
                    borderRadius: 8,
                    background: colors.primary,
                    color: colors.onPrimary,
                    fontSize: 8,
                    lineHeight: 1.2,
                  }}
                >
                  {itemCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <article
        aria-label={fullDateFormatter.format(selectedDate)}
        css={{
          overflow: "hidden",
          border: `1px solid ${isSameDay(selectedDate, today) ? colors.primary : colors.border}`,
          borderRadius: 12,
          background: colors.surface,
        }}
      >
        <header
          css={{
            padding: "10px 12px",
            borderBottom: `1px solid ${colors.divider}`,
            background: colors.surfaceAlt,
          }}
        >
          <h2 css={{ margin: 0, color: colors.textPrimary, fontSize: 15 }}>
            {fullDateFormatter.format(selectedDate)}
          </h2>
        </header>

        <div css={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
          {mealTypes.map(mealType => {
            const items = selectedPlanItems.filter(item => item.meal_type === mealType);

            return (
              <section
                key={mealType}
                css={{
                  padding: 8,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 9,
                  background: colors.surfaceAlt,
                }}
              >
                <h3
                  css={{
                    margin: "0 0 7px",
                    color: colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {mealTypeLabels[mealType]}
                </h3>
                {items.length > 0 ? (
                  <ul
                    css={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      margin: "0 0 7px",
                      padding: 0,
                      listStyle: "none",
                    }}
                  >
                    {items.map(planItem => (
                      <li key={planItem.id}>
                        <MonthPlanItem
                          planItem={planItem}
                          onEdit={() => onEditPlanItem(planItem)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => onAddMeal(selectedDate, mealType)}
                >
                  + Add
                </Button>
              </section>
            );
          })}
        </div>
      </article>
    </section>
  );
};

const MonthPlanItem = ({
  planItem,
  onEdit,
}: {
  planItem: PlanItem;
  onEdit: () => void;
}) => {
  const colors = useColors();
  const calendarColor = colors.primary;

  return (
    <button
      type="button"
      aria-label={`Edit ${planItem.meal_snapshot.name}`}
      onClick={onEdit}
      css={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        alignItems: "center",
        gap: 5,
        boxSizing: "border-box",
        padding: "5px 6px",
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${calendarColor}`,
        borderRadius: 7,
        background: colors.surface,
        color: colors.textPrimary,
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        "&:hover": { borderColor: calendarColor },
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 1,
        },
      }}
    >
      <span
        aria-hidden="true"
        css={{
          flex: "0 0 auto",
          color: calendarColor,
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {shortMealTypeLabels[planItem.meal_type]}
      </span>
      <span
        css={{
          minWidth: 0,
          overflow: "hidden",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1.25,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {planItem.meal_snapshot.name}
      </span>
    </button>
  );
};
