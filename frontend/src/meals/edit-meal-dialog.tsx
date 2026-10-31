import { type FormEvent, type RefObject, useState } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type Meal } from "./api";
import {
  getMealFormData,
  getMealInput,
  MealForm,
  type MealFormErrors,
} from "./meal-form";
import { useUpdateMealMutation } from "./queries";

type EditMealDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  meal: Meal;
  onClose: () => void;
};

export const EditMealDialog = ({ dialogRef, meal, onClose }: EditMealDialogProps) => {
  const colors = useColors();
  const [formData, setFormData] = useState(() => getMealFormData(meal));
  const [formErrors, setFormErrors] = useState<MealFormErrors>({});
  const update = useUpdateMealMutation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.reset();

    const input = getMealInput(formData);
    if (!input.name) {
      setFormErrors({ name: "Enter a meal name." });
      return;
    }

    setFormErrors({});
    update.mutate(
      { mealId: meal.id, input },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Edit meal"
      onClose={onClose}
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
      <MealForm
        data={formData}
        errors={{ ...update.apiFieldErrors, ...formErrors }}
        disabled={update.isPending}
        onChange={data => {
          setFormData(data);
          setFormErrors({});
          update.reset();
        }}
      />

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
