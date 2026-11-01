import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Button, getContentContainerStyles, useColors, useIsMobile } from "@package/ui";

import { AddPlanItemDialog } from "./add-plan-item-dialog";
import { type PlanItem } from "./api";
import { DeletePlanItemDialog } from "./delete-plan-item-dialog";
import { EditPlanItemDialog } from "./edit-plan-item-dialog";
import { usePlanItemsQuery } from "./queries";
import { DEFAULT_MEAL_TYPES, type MealType } from "./types";
import { getDateKey, getStartOfWeek, WeekCalendar } from "./week-calendar";
import { WeekNavigation } from "./week-navigation";

export {
  createPlanItem,
  deletePlanItem,
  getPlanItems,
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
  useDeletePlanItemMutation,
  usePlanItemsQuery,
  useUpdatePlanItemMutation,
} from "./queries";
export { type MealType } from "./types";

export const Plan = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const addPlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const deletePlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const editPlanItemDialogRef = useRef<HTMLDialogElement>(null);
  const [addTarget, setAddTarget] = useState<{
    date: Date;
    mealType: MealType;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanItem | null>(null);
  const [editTarget, setEditTarget] = useState<PlanItem | null>(null);
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const currentWeekStart = getStartOfWeek(new Date());
  const weekRange = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return {
      dateFrom: getDateKey(weekStart),
      dateTo: getDateKey(weekEnd),
    };
  }, [weekStart]);
  const planItemsQuery = usePlanItemsQuery(weekRange);

  useEffect(() => {
    const dialog = addPlanItemDialogRef.current;
    if (addTarget && dialog && !dialog.open) dialog.showModal();
  }, [addTarget]);

  useEffect(() => {
    const dialog = deletePlanItemDialogRef.current;
    if (deleteTarget && dialog && !dialog.open) dialog.showModal();
  }, [deleteTarget]);

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

        <WeekNavigation
          weekStart={weekStart}
          isCurrentWeek={getDateKey(weekStart) === getDateKey(currentWeekStart)}
          isMobile={isMobile}
          onPrevious={() => setWeekStart(current => addWeeks(current, -1))}
          onToday={() => setWeekStart(getStartOfWeek(new Date()))}
          onNext={() => setWeekStart(current => addWeeks(current, 1))}
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

      {deleteTarget ? (
        <DeletePlanItemDialog
          dialogRef={deletePlanItemDialogRef}
          planItem={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {editTarget ? (
        <EditPlanItemDialog
          dialogRef={editPlanItemDialogRef}
          planItem={editTarget}
          onClose={() => setEditTarget(null)}
        />
      ) : null}

      {planItemsQuery.isPending ? <PlanStatus>Loading meal plan…</PlanStatus> : null}
      {planItemsQuery.isError ? (
        <PlanError onRetry={() => void planItemsQuery.refetch()} />
      ) : null}
      {planItemsQuery.isSuccess ? (
        <WeekCalendar
          weekStart={weekStart}
          mealTypes={DEFAULT_MEAL_TYPES}
          planItems={planItemsQuery.data}
          isMobile={isMobile}
          onAddMeal={(date, mealType) => setAddTarget({ date, mealType })}
          onEditPlanItem={setEditTarget}
          onRemovePlanItem={setDeleteTarget}
        />
      ) : null}
    </main>
  );
};

const addWeeks = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount * 7);
  return result;
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
