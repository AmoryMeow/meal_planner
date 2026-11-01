import { useEffect, useState } from "react";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { getDateKey, getMonthGridDays, isSameDay } from "./date-utils";
import {
  PlanDragAndDropProvider,
  usePlanDropTarget,
  usePlanItemDraggable,
} from "./plan-drag-and-drop";
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

  const calendar = isMobile ? (
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

  return <PlanDragAndDropProvider>{calendar}</PlanDragAndDropProvider>;
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
            {days.map(day => (
              <DesktopMonthDay
                key={getDateKey(day)}
                day={day}
                monthStart={monthStart}
                planItems={planItems}
                defaultMealType={defaultMealType}
                onAddMeal={onAddMeal}
                onEditPlanItem={onEditPlanItem}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const DesktopMonthDay = ({
  day,
  monthStart,
  planItems,
  defaultMealType,
  onAddMeal,
  onEditPlanItem,
}: {
  day: Date;
  monthStart: Date;
  planItems: PlanItem[];
  defaultMealType?: MealType;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const dayPlanItems = planItems.filter(item => item.date === dateKey);
  const isCurrentMonth = day.getMonth() === monthStart.getMonth();
  const isToday = isSameDay(day, new Date());
  const { isOver, setNodeRef } = usePlanDropTarget({
    id: `month-day:${dateKey}`,
    date: dateKey,
  });

  return (
    <article
      ref={setNodeRef}
      aria-label={fullDateFormatter.format(day)}
      css={{
        display: "flex",
        minHeight: 138,
        minWidth: 0,
        flexDirection: "column",
        gap: 6,
        padding: 7,
        border: `1px solid ${
          isOver
            ? colors.primary
            : isToday
              ? colors.primary
              : isCurrentMonth
                ? colors.border
                : colors.divider
        }`,
        borderRadius: 10,
        background: isOver ? hexToRgba(colors.primary, 0.1) : colors.surface,
        boxShadow: isOver
          ? `inset 0 0 0 1px ${hexToRgba(colors.primary, 0.35)}`
          : "none",
        transition: "border-color 0.15s ease, background 0.15s ease",
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
          <span css={{ color: colors.primary, fontSize: 9, fontWeight: 700 }}>
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
        {days.map(day => (
          <MobileMonthDayButton
            key={getDateKey(day)}
            day={day}
            monthStart={monthStart}
            itemCount={planItems.filter(item => item.date === getDateKey(day)).length}
            isSelected={isSameDay(day, selectedDate)}
            onSelect={() => setSelectedDate(day)}
          />
        ))}
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
          {mealTypes.map(mealType => (
            <MobileMonthMealSection
              key={mealType}
              date={selectedDate}
              mealType={mealType}
              planItems={selectedPlanItems.filter(item => item.meal_type === mealType)}
              onAddMeal={onAddMeal}
              onEditPlanItem={onEditPlanItem}
            />
          ))}
        </div>
      </article>
    </section>
  );
};

const MobileMonthDayButton = ({
  day,
  monthStart,
  itemCount,
  isSelected,
  onSelect,
}: {
  day: Date;
  monthStart: Date;
  itemCount: number;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const isCurrentMonth = day.getMonth() === monthStart.getMonth();
  const isToday = isSameDay(day, new Date());
  const { isOver, setNodeRef } = usePlanDropTarget({
    id: `month-day-button:${dateKey}`,
    date: dateKey,
    disabled: !isCurrentMonth,
  });

  useEffect(() => {
    if (isOver && !isSelected) onSelect();
  }, [isOver, isSelected, onSelect]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={!isCurrentMonth}
      aria-label={fullDateFormatter.format(day)}
      aria-pressed={isSelected}
      onClick={onSelect}
      css={{
        display: "flex",
        minHeight: 46,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: 3,
        border: `1px solid ${isSelected || isOver ? colors.primary : colors.border}`,
        borderRadius: 8,
        background:
          isSelected || isOver ? hexToRgba(colors.primary, 0.12) : colors.surface,
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
};

const MobileMonthMealSection = ({
  date,
  mealType,
  planItems,
  onAddMeal,
  onEditPlanItem,
}: {
  date: Date;
  mealType: MealType;
  planItems: PlanItem[];
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(date);
  const { isOver, setNodeRef } = usePlanDropTarget({
    id: `month-slot:${dateKey}:${mealType}`,
    date: dateKey,
    mealType,
  });

  return (
    <section
      ref={setNodeRef}
      css={{
        padding: 8,
        border: `1px solid ${isOver ? colors.primary : colors.border}`,
        borderRadius: 9,
        background: isOver ? hexToRgba(colors.primary, 0.1) : colors.surfaceAlt,
        boxShadow: isOver
          ? `inset 0 0 0 1px ${hexToRgba(colors.primary, 0.35)}`
          : "none",
        transition: "border-color 0.15s ease, background 0.15s ease",
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
      {planItems.length > 0 ? (
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
          {planItems.map(planItem => (
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
        onClick={() => onAddMeal(date, mealType)}
      >
        + Add
      </Button>
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
  const { attributes, dragDisabled, isDragging, listeners, setNodeRef } =
    usePlanItemDraggable(planItem, "compact");

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      aria-label={`${planItem.meal_snapshot.name}. Press Enter to edit or Space to move.`}
      disabled={dragDisabled}
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
        cursor: dragDisabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        touchAction: "manipulation",
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
