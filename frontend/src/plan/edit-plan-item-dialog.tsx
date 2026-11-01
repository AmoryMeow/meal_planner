import {
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  useId,
  useState,
} from "react";

import { Button, Dialog, hexToRgba, Input, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { useUpdatePlanItemMutation } from "./queries";
import { type MealType } from "./types";

type EditPlanItemDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  planItem: PlanItem;
  onClose: () => void;
};

type PlanItemFormData = {
  date: string;
  mealType: MealType;
  servings: string;
  note: string;
};

type PlanItemFormErrors = Partial<Record<keyof PlanItemFormData, string>>;

const getInitialFormData = (planItem: PlanItem): PlanItemFormData => ({
  date: planItem.date,
  mealType: planItem.meal_type,
  servings: String(planItem.servings),
  note: planItem.note,
});

export const EditPlanItemDialog = ({
  dialogRef,
  planItem,
  onClose,
}: EditPlanItemDialogProps) => {
  const colors = useColors();
  const mealTypeId = useId();
  const mealTypeErrorId = useId();
  const noteId = useId();
  const noteErrorId = useId();
  const [formData, setFormData] = useState(() => getInitialFormData(planItem));
  const [formErrors, setFormErrors] = useState<PlanItemFormErrors>({});
  const update = useUpdatePlanItemMutation();

  const resetForm = () => {
    setFormData(getInitialFormData(planItem));
    setFormErrors({});
    update.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(current => ({ ...current, [name]: value }));
    setFormErrors({});
    update.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.reset();

    const servings = Number(formData.servings);
    const errors: PlanItemFormErrors = {};
    if (!formData.date) errors.date = "Required";
    if (!formData.servings) errors.servings = "Required";
    else if (!Number.isInteger(servings) || servings < 1) {
      errors.servings = "Enter a whole number greater than zero.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    update.mutate(
      {
        planItemId: planItem.id,
        input: {
          date: formData.date,
          meal_type: formData.mealType,
          servings,
          note: formData.note.trim(),
        },
      },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title={`Edit ${planItem.meal_snapshot.name}`}
      onClose={handleClose}
      onCancel={event => {
        if (update.isPending) event.preventDefault();
      }}
      onSubmit={handleSubmit}
      closeDisabled={update.isPending}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={update.isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <Input
        label="Date"
        type="date"
        name="date"
        value={formData.date}
        onChange={handleInputChange}
        error={update.apiFieldErrors.date || formErrors.date}
        disabled={update.isPending}
        required
      />

      <div>
        <label
          htmlFor={mealTypeId}
          css={{
            display: "block",
            marginBottom: 8,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Meal type
        </label>
        <select
          id={mealTypeId}
          value={formData.mealType}
          disabled={update.isPending}
          aria-invalid={Boolean(update.apiFieldErrors.meal_type)}
          aria-describedby={
            update.apiFieldErrors.meal_type ? mealTypeErrorId : undefined
          }
          onChange={event => {
            setFormData(current => ({
              ...current,
              mealType: event.target.value as MealType,
            }));
            update.reset();
          }}
          css={{
            width: "100%",
            height: 44,
            boxSizing: "border-box",
            padding: "0 12px",
            border: update.apiFieldErrors.meal_type
              ? `1px solid ${colors.danger}`
              : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: update.isPending ? colors.surfaceAlt : colors.background,
            color: colors.textPrimary,
            font: "inherit",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              borderColor: colors.focus,
            },
          }}
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
        </select>
        {update.apiFieldErrors.meal_type ? (
          <div
            id={mealTypeErrorId}
            role="alert"
            css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
          >
            {update.apiFieldErrors.meal_type}
          </div>
        ) : null}
      </div>

      <Input
        label="Servings"
        type="number"
        name="servings"
        value={formData.servings}
        onChange={handleInputChange}
        error={update.apiFieldErrors.servings || formErrors.servings}
        disabled={update.isPending}
        min={1}
        step={1}
        required
      />

      <div>
        <label
          htmlFor={noteId}
          css={{
            display: "block",
            marginBottom: 8,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Note
        </label>
        <textarea
          id={noteId}
          value={formData.note}
          disabled={update.isPending}
          aria-invalid={Boolean(update.apiFieldErrors.note)}
          aria-describedby={update.apiFieldErrors.note ? noteErrorId : undefined}
          onChange={event => {
            setFormData(current => ({ ...current, note: event.target.value }));
            update.reset();
          }}
          rows={3}
          css={{
            width: "100%",
            minHeight: 88,
            boxSizing: "border-box",
            resize: "vertical",
            padding: "10px 12px",
            border: update.apiFieldErrors.note
              ? `1px solid ${colors.danger}`
              : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: update.isPending ? colors.surfaceAlt : colors.background,
            color: colors.textPrimary,
            font: "inherit",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              borderColor: colors.focus,
            },
          }}
        />
        {update.apiFieldErrors.note ? (
          <div
            id={noteErrorId}
            role="alert"
            css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
          >
            {update.apiFieldErrors.note}
          </div>
        ) : null}
      </div>

      {update.submitError ? (
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
          {update.submitError}
        </div>
      ) : null}
    </Dialog>
  );
};
