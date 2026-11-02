import { type FormEvent, type RefObject, useId, useState } from "react";

import { MealCombobox, type MealOption } from "@package/meals";
import { Button, Dialog, Input, Textarea, useColors } from "@package/ui";

import { type MealPlan } from "./api";
import { getDateKey } from "./date-utils";
import { MealTypeSelect } from "./meal-type-select";
import { useCreatePlanItemMutation } from "./queries";
import { type MealType } from "./types";

type AddPlanItemDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  date: Date;
  mealType: MealType;
  plans: MealPlan[];
  onClose: () => void;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export const AddPlanItemDialog = ({
  dialogRef,
  date,
  mealType,
  plans,
  onClose,
}: AddPlanItemDialogProps) => {
  const colors = useColors();
  const creation = useCreatePlanItemMutation();
  const [selectedMeal, setSelectedMeal] = useState<MealOption | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? 0);
  const [selectedMealType, setSelectedMealType] = useState(mealType);
  const [selectionError, setSelectionError] = useState("");
  const [servings, setServings] = useState("1");
  const [servingsError, setServingsError] = useState("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    setSelectedMeal(null);
    setSelectedPlanId(plans[0]?.id ?? 0);
    setSelectedMealType(mealType);
    setSelectionError("");
    setServings("1");
    setServingsError("");
    setNote("");
    creation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    const servingsValue = Number(servings);
    const hasMealError = !selectedMeal;
    const servingsValidationError = !servings
      ? "Required"
      : !Number.isInteger(servingsValue) || servingsValue < 1
        ? "Enter a whole number greater than zero."
        : "";

    setSelectionError(hasMealError ? "Required" : "");
    setServingsError(servingsValidationError);
    if (!selectedMeal || servingsValidationError) {
      return;
    }

    creation.mutate(
      {
        plan_id: selectedPlanId,
        date: getDateKey(date),
        meal_type: selectedMealType,
        meal_id: selectedMeal.id,
        servings: servingsValue,
        note: note.trim(),
      },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Add meal"
      onClose={handleClose}
      onCancel={event => {
        if (creation.isPending) event.preventDefault();
      }}
      onSubmit={handleSubmit}
      closeDisabled={creation.isPending}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={creation.isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={creation.isPending}>
            Add
          </Button>
        </>
      }
    >
      <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
        {dateFormatter.format(date)}
      </p>

      <PlanSelect
        plans={plans}
        value={selectedPlanId}
        disabled={creation.isPending}
        error={creation.apiFieldErrors.plan_id}
        onChange={value => {
          setSelectedPlanId(value);
          creation.reset();
        }}
      />

      <MealCombobox
        value={selectedMeal}
        disabled={creation.isPending}
        error={selectionError || creation.apiFieldErrors.meal_id}
        onChange={meal => {
          setSelectedMeal(meal);
          setSelectionError("");
          creation.reset();
        }}
      />

      <MealTypeSelect
        value={selectedMealType}
        disabled={creation.isPending}
        error={creation.apiFieldErrors.meal_type}
        onChange={value => {
          setSelectedMealType(value);
          creation.reset();
        }}
      />

      <Input
        label="Servings"
        type="number"
        name="servings"
        value={servings}
        onChange={event => {
          setServings(event.target.value);
          setServingsError("");
          creation.reset();
        }}
        error={creation.apiFieldErrors.servings || servingsError}
        disabled={creation.isPending}
        min={1}
        step={1}
        required
      />

      <Textarea
        label="Note"
        name="note"
        value={note}
        onChange={event => {
          setNote(event.target.value);
          creation.reset();
        }}
        error={creation.apiFieldErrors.note}
        disabled={creation.isPending}
        placeholder="Optional details"
      />

      {creation.submitError ? (
        <div
          role="alert"
          css={{
            padding: "10px 12px",
            border: `1px solid ${colors.danger}`,
            borderRadius: 8,
            color: colors.danger,
            fontSize: 14,
          }}
        >
          {creation.submitError}
        </div>
      ) : null}
    </Dialog>
  );
};

const PlanSelect = ({
  plans,
  value,
  disabled,
  error,
  onChange,
}: {
  plans: MealPlan[];
  value: number;
  disabled: boolean;
  error?: string;
  onChange: (planId: number) => void;
}) => {
  const colors = useColors();
  const selectId = useId();
  const errorId = useId();

  return (
    <div>
      <label
        htmlFor={selectId}
        css={{
          display: "block",
          marginBottom: 8,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Plan
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={event => onChange(Number(event.target.value))}
        css={{
          width: "100%",
          height: 44,
          boxSizing: "border-box",
          padding: "0 12px",
          border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
          borderRadius: 8,
          background: disabled ? colors.surfaceAlt : colors.background,
          color: colors.textPrimary,
          font: "inherit",
          "&:focus-visible": {
            outline: `3px solid ${colors.focus}`,
            borderColor: colors.focus,
          },
        }}
      >
        {plans.map(plan => (
          <option key={plan.id} value={plan.id}>
            {plan.name} ({plan.scope === "group" ? "Group" : "Personal"})
          </option>
        ))}
      </select>
      {error ? (
        <div
          id={errorId}
          role="alert"
          css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
};
