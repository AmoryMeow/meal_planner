import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Button, getContentContainerStyles, useColors, useIsMobile } from "@package/ui";

import { AddPlanItemDialog } from "./add-plan-item-dialog";
import { type PlanItem } from "./api";
import { CalendarNavigation } from "./calendar-navigation";
import { CalendarViewToggle } from "./calendar-view-toggle";
import {
  addDays,
  addMonths,
  addWeeks,
  getDateKey,
  getMonthGridDays,
  getStartOfMonth,
  getStartOfWeek,
} from "./date-utils";
import { EditPlanItemDialog } from "./edit-plan-item-dialog";
import { MonthCalendar } from "./month-calendar";
import { usePlanItemsQuery } from "./queries";
import { RemovePlanItemDialog } from "./remove-plan-item-dialog";
import { type CalendarView, DEFAULT_MEAL_TYPES, type MealType } from "./types";
import { WeekCalendar } from "./week-calendar";

export {
  createPlanItem,
  getPlanItems,
  removePlanItem,
  updatePlanItem,
  type CreatePlanItemInput,
  type MealSnapshot,
  type MealSnapshotIngredient,
  type PlanItem,
  type PlanItemRange,
  type UpdatePlanItemInput,
} from "./api";
export {
  planItemQueryKeys,
  useCreatePlanItemMutation,
  usePlanItemsQuery,
  useRemovePlanItemMutation,
  useUpdatePlanItemMutation,
} from "./queries";
export { type CalendarView, type MealType } from "./types";

const currentYearWeekFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const otherYearWeekFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const currentYearMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
});

const otherYearMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export const Plan = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const addPlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const removePlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const editPlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const [addTarget, setAddTarget] = useState<{
    date: Date;
    mealType: MealType;
  } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PlanItem | null>(null);
  const [editTarget, setEditTarget] = useState<PlanItem | null>(null);
  const [calendarView, setCalendarView] = useState<CalendarView>("week");
  const [visibleDate, setVisibleDate] = useState(() => new Date());
  const weekStart = getStartOfWeek(visibleDate);
  const monthStart = getStartOfMonth(visibleDate);
  const visibleRange = useMemo(() => {
    if (calendarView === "week") {
      const start = getStartOfWeek(visibleDate);
      return {
        dateFrom: getDateKey(start),
        dateTo: getDateKey(addDays(start, 6)),
      };
    }

    const days = getMonthGridDays(getStartOfMonth(visibleDate));
    return {
      dateFrom: getDateKey(days[0] ?? visibleDate),
      dateTo: getDateKey(days.at(-1) ?? visibleDate),
    };
  }, [calendarView, visibleDate]);
  const planItemsQuery = usePlanItemsQuery(visibleRange);
  const isCurrentPeriod =
    calendarView === "week"
      ? getDateKey(weekStart) === getDateKey(getStartOfWeek(new Date()))
      : getDateKey(monthStart) === getDateKey(getStartOfMonth(new Date()));
  const navigationLabel =
    calendarView === "week"
      ? formatWeekRange(weekStart, addDays(weekStart, 6))
      : formatMonth(monthStart);

  useEffect(() => {
    const dialog = addPlanItemDialogRef.current;
    if (addTarget && dialog && !dialog.open) dialog.showModal();
  }, [addTarget]);

  useEffect(() => {
    const dialog = removePlanItemDialogRef.current;
    if (removeTarget && dialog && !dialog.open) dialog.showModal();
  }, [removeTarget]);

  useEffect(() => {
    const dialog = editPlanItemDialogRef.current;
    if (editTarget && dialog && !dialog.open) dialog.showModal();
  }, [editTarget]);

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
      <header
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            width: isMobile ? "100%" : "auto",
          }}
        >
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
          <CalendarViewToggle value={calendarView} onChange={setCalendarView} />
        </div>

        <CalendarNavigation
          label={navigationLabel}
          periodLabel={calendarView}
          isCurrentPeriod={isCurrentPeriod}
          isMobile={isMobile}
          onPrevious={() =>
            setVisibleDate(current =>
              calendarView === "week"
                ? addWeeks(getStartOfWeek(current), -1)
                : addMonths(getStartOfMonth(current), -1)
            )
          }
          onToday={() => setVisibleDate(new Date())}
          onNext={() =>
            setVisibleDate(current =>
              calendarView === "week"
                ? addWeeks(getStartOfWeek(current), 1)
                : addMonths(getStartOfMonth(current), 1)
            )
          }
        />
      </header>

      {addTarget ? (
        <AddPlanItemDialog
          dialogRef={addPlanItemDialogRef}
          date={addTarget.date}
          mealType={addTarget.mealType}
          onClose={() => setAddTarget(null)}
        />
      ) : null}

      {removeTarget ? (
        <RemovePlanItemDialog
          dialogRef={removePlanItemDialogRef}
          planItem={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onRemoved={() => editPlanItemDialogRef.current?.close()}
        />
      ) : null}

      {editTarget ? (
        <EditPlanItemDialog
          dialogRef={editPlanItemDialogRef}
          planItem={editTarget}
          onClose={() => setEditTarget(null)}
          onRemove={() => setRemoveTarget(editTarget)}
        />
      ) : null}

      {planItemsQuery.isPending ? <PlanStatus>Loading meal plan…</PlanStatus> : null}
      {planItemsQuery.isError ? (
        <PlanError onRetry={() => void planItemsQuery.refetch()} />
      ) : null}
      {planItemsQuery.isSuccess && calendarView === "week" ? (
        <WeekCalendar
          weekStart={weekStart}
          mealTypes={DEFAULT_MEAL_TYPES}
          planItems={planItemsQuery.data}
          isMobile={isMobile}
          onAddMeal={(date, mealType) => setAddTarget({ date, mealType })}
          onEditPlanItem={setEditTarget}
        />
      ) : null}
      {planItemsQuery.isSuccess && calendarView === "month" ? (
        <MonthCalendar
          monthStart={monthStart}
          mealTypes={DEFAULT_MEAL_TYPES}
          planItems={planItemsQuery.data}
          isMobile={isMobile}
          onAddMeal={(date, mealType) => setAddTarget({ date, mealType })}
          onEditPlanItem={setEditTarget}
        />
      ) : null}
    </main>
  );
};

const formatWeekRange = (weekStart: Date, weekEnd: Date): string => {
  const currentYear = new Date().getFullYear();
  const isCurrentYear =
    weekStart.getFullYear() === currentYear && weekEnd.getFullYear() === currentYear;
  const formatter = isCurrentYear ? currentYearWeekFormatter : otherYearWeekFormatter;

  return formatter.formatRange(weekStart, weekEnd);
};

const formatMonth = (monthStart: Date): string => {
  const formatter =
    monthStart.getFullYear() === new Date().getFullYear()
      ? currentYearMonthFormatter
      : otherYearMonthFormatter;
  return formatter.format(monthStart);
};

const PlanStatus = ({ children }: { children: ReactNode }) => {
  const colors = useColors();

  return (
    <p
      role="status"
      css={{
        margin: 0,
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        background: colors.surface,
        color: colors.textSecondary,
        textAlign: "center",
      }}
    >
      {children}
    </p>
  );
};

const PlanError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();

  return (
    <div
      role="alert"
      css={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
        padding: 20,
        border: `1px solid ${colors.danger}`,
        borderRadius: 12,
        background: colors.surface,
        color: colors.textPrimary,
      }}
    >
      <span>Unable to load the meal plan.</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
};
