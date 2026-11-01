import { useState } from "react";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { type MealType } from "./types";

type WeekCalendarProps = {
  weekStart: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  isMobile: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onRemovePlanItem: (planItem: PlanItem) => void;
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
  onRemovePlanItem,
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

  if (isMobile) {
    return (
      <MobileWeekCalendar
        key={getDateKey(weekStart)}
        days={days}
        mealTypes={mealTypes}
        planItems={planItems}
        onAddMeal={onAddMeal}
        onRemovePlanItem={onRemovePlanItem}
      />
    );
  }

  return (
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
              onRemovePlanItem={onRemovePlanItem}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const MobileWeekCalendar = ({
  days,
  mealTypes,
  planItems,
  onAddMeal,
  onRemovePlanItem,
}: {
  days: Date[];
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  onAddMeal: (date: Date, mealType: MealType) => void;
  onRemovePlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
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
        {days.map((day, index) => {
          const isSelected = index === selectedDayIndex;
          const isToday = isSameDay(day, new Date());
          const dateKey = getDateKey(day);

          return (
            <button
              key={dateKey}
              type="button"
              aria-pressed={isSelected}
              aria-label={fullDateFormatter.format(day)}
              onClick={() => setSelectedDayIndex(index)}
              css={{
                display: "flex",
                minHeight: 48,
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: "5px 4px",
                border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                borderRadius: 9,
                background: isSelected
                  ? hexToRgba(colors.primary, 0.12)
                  : colors.surface,
                color: isSelected ? colors.primary : colors.textSecondary,
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
        })}
      </div>

      <div>
        <DayColumn
          day={selectedDay}
          mealTypes={mealTypes}
          planItems={planItems}
          isToday={isSameDay(selectedDay, new Date())}
          onAddMeal={onAddMeal}
          onRemovePlanItem={onRemovePlanItem}
        />
      </div>
    </section>
  );
};

const DayColumn = ({
  day,
  mealTypes,
  planItems,
  isToday,
  onAddMeal,
  onRemovePlanItem,
}: {
  day: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  isToday: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onRemovePlanItem: (planItem: PlanItem) => void;
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
            onRemovePlanItem={onRemovePlanItem}
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
  onRemovePlanItem,
}: {
  date: Date;
  mealType: MealType;
  planItems: PlanItem[];
  onAddMeal: (date: Date, mealType: MealType) => void;
  onRemovePlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const label = mealTypeLabels[mealType];
  const sectionHeadingId = `plan-${getDateKey(date)}-${mealType}`;

  return (
    <section
      aria-labelledby={sectionHeadingId}
      css={{
        display: "flex",
        minHeight: 96,
        flexDirection: "column",
        boxSizing: "border-box",
        padding: 8,
        border: `1px solid ${colors.border}`,
        borderRadius: 9,
        background: colors.surfaceAlt,
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
                onRemove={() => onRemovePlanItem(planItem)}
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
  onRemove,
}: {
  planItem: PlanItem;
  onRemove: () => void;
}) => {
  const colors = useColors();

  return (
    <article
      css={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
        padding: "4px 4px 4px 9px",
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: 8,
        background: colors.surface,
        "&:hover [data-plan-item-action], &:focus-within [data-plan-item-action]": {
          opacity: 1,
        },
      }}
    >
      <h4
        css={{
          margin: 0,
          overflowWrap: "anywhere",
          color: colors.textPrimary,
          fontSize: 13,
          lineHeight: 1.3,
        }}
      >
        {planItem.meal_snapshot.name}
      </h4>

      <div
        data-plan-item-action
        css={{
          color: colors.danger,
          "& > button": { color: "inherit" },
          "@media (hover: hover) and (pointer: fine)": {
            opacity: 0,
            transition: "opacity 0.15s ease",
          },
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          icon={<TrashIcon />}
          ariaLabel={`Remove ${planItem.meal_snapshot.name} from plan`}
          onClick={onRemove}
        />
      </div>
    </article>
  );
};

const TrashIcon = () => (
  <svg
    aria-hidden="true"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="m19 6-1 14H6L5 6" />
    <path d="M10 11v5M14 11v5" />
  </svg>
);

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

export const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const isSameDay = (first: Date, second: Date): boolean =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export const getDateKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
