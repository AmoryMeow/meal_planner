import { type FormEvent, type RefObject, useState } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type Meal } from "./api";
import { MealIngredientsSummary } from "./meal-details-dialog";
import {
  getMealFormData,
  getMealInput,
  MealForm,
  type MealFormErrors,
} from "./meal-form";
import {
  MealIngredientsEditor,
  useMealIngredientsEditor,
} from "./meal-ingredients-editor";
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
  const ingredientsEditor = useMealIngredientsEditor(meal.id, meal.is_owner);
  const isSaving = update.isPending || ingredientsEditor.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.reset();

    const input = getMealInput(formData);
    if (!input.name) {
      setFormErrors({ name: "Enter a meal name." });
      return;
    }
    if (meal.is_owner && !ingredientsEditor.validate()) return;

    setFormErrors({});
    try {
      await update.mutateAsync({ mealId: meal.id, input });
      const ingredientsSaved = meal.is_owner ? await ingredientsEditor.save() : true;
      if (ingredientsSaved) dialogRef.current?.close();
    } catch {
      // Mutation errors are rendered by their corresponding form sections.
    }
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Edit meal"
      onClose={onClose}
      onCancel={event => {
        if (isSaving) event.preventDefault();
      }}
      onSubmit={handleSubmit}
      closeDisabled={isSaving}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isSaving}>
            Save
          </Button>
        </>
      }
    >
      <MealForm
        data={formData}
        errors={{ ...update.apiFieldErrors, ...formErrors }}
        disabled={isSaving}
        onChange={data => {
          setFormData(data);
          setFormErrors({});
          update.reset();
        }}
      />

      {meal.is_owner ? (
        <MealIngredientsEditor editor={ingredientsEditor} disabled={isSaving} />
      ) : (
        <div>
          <p
            css={{
              margin: "0 0 10px",
              color: colors.textSecondary,
              fontSize: 13,
            }}
          >
            Ingredients are currently managed by the meal owner.
          </p>
          <MealIngredientsSummary ingredients={meal.ingredients} />
        </div>
      )}

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
