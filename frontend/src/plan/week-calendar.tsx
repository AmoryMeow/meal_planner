import { useEffect, useState } from "react";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { addDays, getDateKey, isSameDay } from "./date-utils";
import {
  PlanDragAndDropProvider,
  usePlanDropTarget,
  usePlanItemDraggable,
} from "./plan-drag-and-drop";
import { type MealType } from "./types";

type WeekCalendarProps = {
  weekStart: Date;
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

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const WeekCalendar = ({
  weekStart,
  mealTypes,
  planItems,
  isMobile,
  onAddMeal,
  onEditPlanItem,
}: WeekCalendarProps) => {
  const colors = useColors();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

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
    <MobileWeekCalendar
      key={getDateKey(weekStart)}
      days={days}
      mealTypes={mealTypes}
      planItems={planItems}
      onAddMeal={onAddMeal}
      onEditPlanItem={onEditPlanItem}
    />
  ) : (
    <section aria-label="Weekly meal plan">
      <div css={{ overflowX: "auto", padding: "3px 3px 8px" }}>
        <div
          css={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            alignItems: "start",
            gap: 8,
            minWidth: 980,
          }}
        >
          {days.map(day => (
            <DayColumn
              key={getDateKey(day)}
              day={day}
              mealTypes={mealTypes}
              planItems={planItems}
              isToday={isSameDay(day, new Date())}
              onAddMeal={onAddMeal}
              onEditPlanItem={onEditPlanItem}
            />
          ))}
        </div>
      </div>
    </section>
  );

  return <PlanDragAndDropProvider>{calendar}</PlanDragAndDropProvider>;
};

const MobileWeekCalendar = ({
  days,
  mealTypes,
  planItems,
  onAddMeal,
  onEditPlanItem,
}: {
  days: Date[];
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const todayIndex = days.findIndex(day => isSameDay(day, new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    todayIndex >= 0 ? todayIndex : 0
  );
  const selectedDay = days[selectedDayIndex] ?? days[0];

  if (!selectedDay) return null;

  return (
    <section aria-label="Weekly meal plan">
      <div
        role="group"
        aria-label="Choose day"
        css={{
          display: "grid",
          gridAutoColumns: "minmax(44px, 1fr)",
          gridAutoFlow: "column",
          gap: 4,
          marginBottom: 10,
          overflowX: "auto",
          padding: "2px 2px 6px",
        }}
      >
        {days.map((day, index) => (
          <MobileDayTab
            key={getDateKey(day)}
            day={day}
            isSelected={index === selectedDayIndex}
            onSelect={() => setSelectedDayIndex(index)}
          />
        ))}
      </div>

      <div>
        <DayColumn
          day={selectedDay}
          mealTypes={mealTypes}
          planItems={planItems}
          isToday={isSameDay(selectedDay, new Date())}
          onAddMeal={onAddMeal}
          onEditPlanItem={onEditPlanItem}
        />
      </div>
    </section>
  );
};

const MobileDayTab = ({
  day,
  isSelected,
  onSelect,
}: {
  day: Date;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const isToday = isSameDay(day, new Date());
  const { isOver, setNodeRef } = usePlanDropTarget({
    id: `plan-day-tab:${dateKey}`,
    date: dateKey,
  });

  useEffect(() => {
    if (isOver && !isSelected) onSelect();
  }, [isOver, isSelected, onSelect]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={isSelected}
      aria-label={fullDateFormatter.format(day)}
      onClick={onSelect}
      css={{
        display: "flex",
        minHeight: 48,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "5px 4px",
        border: `1px solid ${isSelected || isOver ? colors.primary : colors.border}`,
        borderRadius: 9,
        background:
          isSelected || isOver ? hexToRgba(colors.primary, 0.12) : colors.surface,
        color: isSelected || isOver ? colors.primary : colors.textSecondary,
        font: "inherit",
        cursor: "pointer",
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <span css={{ fontSize: 11, fontWeight: 700 }}>
        {weekdayFormatter.format(day)}
      </span>
      <span css={{ fontSize: 13, fontWeight: 700 }}>{day.getDate()}</span>
      {isToday ? (
        <span
          aria-hidden="true"
          css={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: colors.primary,
          }}
        />
      ) : null}
    </button>
  );
};

const DayColumn = ({
  day,
  mealTypes,
  planItems,
  isToday,
  onAddMeal,
  onEditPlanItem,
}: {
  day: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  isToday: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const dayHeadingId = `plan-day-${dateKey}`;
  const dayPlanItems = planItems.filter(item => item.date === dateKey);

  return (
    <article
      aria-labelledby={dayHeadingId}
      css={{
        minWidth: 0,
        overflow: "hidden",
        border: `1px solid ${isToday ? colors.primary : colors.border}`,
        borderRadius: 12,
        background: isToday ? hexToRgba(colors.primary, 0.025) : colors.surface,
        boxShadow: isToday ? `0 0 0 2px ${hexToRgba(colors.primary, 0.1)}` : "none",
      }}
    >
      <header
        css={{
          minHeight: 58,
          boxSizing: "border-box",
          padding: "9px 10px",
          borderBottom: `1px solid ${colors.divider}`,
          background: isToday ? hexToRgba(colors.primary, 0.1) : colors.surfaceAlt,
        }}
      >
        <div
          css={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 5,
          }}
        >
          <h2
            id={dayHeadingId}
            title={fullDateFormatter.format(day)}
            css={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              margin: 0,
              color: colors.textPrimary,
              fontSize: 14,
              lineHeight: 1.3,
            }}
          >
            <span>{weekdayFormatter.format(day)}</span>
            <span
              css={{
                color: isToday ? colors.primary : colors.textSecondary,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {dateFormatter.format(day)}
            </span>
          </h2>
          {isToday ? (
            <span
              css={{
                color: colors.primary,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Today
            </span>
          ) : null}
        </div>
      </header>

      <div
        css={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 8,
        }}
      >
        {mealTypes.map(mealType => (
          <MealSection
            key={mealType}
            date={day}
            mealType={mealType}
            planItems={dayPlanItems.filter(item => item.meal_type === mealType)}
            onAddMeal={onAddMeal}
            onEditPlanItem={onEditPlanItem}
          />
        ))}
      </div>
    </article>
  );
};

const MealSection = ({
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
  const label = mealTypeLabels[mealType];
  const dateKey = getDateKey(date);
  const sectionHeadingId = `plan-${dateKey}-${mealType}`;
  const { isOver, setNodeRef } = usePlanDropTarget({
    id: `plan-slot:${dateKey}:${mealType}`,
    date: dateKey,
    mealType,
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={sectionHeadingId}
      css={{
        display: "flex",
        minHeight: 96,
        flexDirection: "column",
        boxSizing: "border-box",
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
        id={sectionHeadingId}
        css={{
          margin: "0 0 8px",
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {label}
      </h3>

      {planItems.length > 0 ? (
        <ul
          aria-label={`${label} meals`}
          css={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            margin: "0 0 8px",
            padding: 0,
            listStyle: "none",
          }}
        >
          {planItems.map(planItem => (
            <li key={planItem.id}>
              <PlanItemCard
                planItem={planItem}
                onEdit={() => onEditPlanItem(planItem)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div
        css={{
          marginTop: "auto",
          "& > button": {
            borderStyle: "dashed",
            color: colors.textSecondary,
          },
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<PlusIcon />}
          ariaLabel={`Add meal to ${label.toLowerCase()} on ${fullDateFormatter.format(date)}`}
          onClick={() => onAddMeal(date, mealType)}
        >
          Add
        </Button>
      </div>
    </section>
  );
};

const PlanItemCard = ({
  planItem,
  onEdit,
}: {
  planItem: PlanItem;
  onEdit: () => void;
}) => {
  const colors = useColors();
  const { attributes, dragDisabled, isDragging, listeners, setNodeRef } =
    usePlanItemDraggable(planItem);

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
        display: "block",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "7px 9px",
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: 8,
        background: colors.surface,
        color: colors.textPrimary,
        font: "inherit",
        textAlign: "left",
        cursor: dragDisabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "border-color 0.15s ease",
        touchAction: "manipulation",
        "&:hover": {
          borderColor: colors.primary,
          borderLeftColor: colors.primary,
        },
        "&:focus": { outline: "none" },
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <span
        css={{
          display: "block",
          margin: 0,
          overflowWrap: "anywhere",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {planItem.meal_snapshot.name}
      </span>
    </button>
  );
};

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
