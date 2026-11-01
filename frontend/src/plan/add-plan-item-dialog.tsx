import { type FormEvent, type RefObject, useMemo, useState } from "react";

import { type Meal, useMealsQuery } from "@package/meals";
import { Button, Combobox, Dialog, useColors } from "@package/ui";

import { useCreatePlanItemMutation } from "./queries";
import { type MealType } from "./types";
import { getDateKey } from "./week-calendar";

type AddPlanItemDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  date: Date;
  mealType: MealType;
  onClose: () => void;
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
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
  onClose,
}: AddPlanItemDialogProps) => {
  const colors = useColors();
  const mealsQuery = useMealsQuery();
  const creation = useCreatePlanItemMutation();
  const [inputValue, setInputValue] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const meals = useMemo(() => mealsQuery.data?.results ?? [], [mealsQuery.data]);
  const normalizedInput =
    inputValue === selectedMeal?.name ? "" : inputValue.trim().toLocaleLowerCase();
  const options = meals
    .filter(meal => meal.name.toLocaleLowerCase().includes(normalizedInput))
    .map(meal => ({ id: meal.id, label: meal.name }));
  const selectedOptions = selectedMeal
    ? [{ id: selectedMeal.id, label: selectedMeal.name }]
    : [];

  const resetForm = () => {
    setInputValue("");
    setSelectedMeal(null);
    setSelectionError("");
    creation.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    if (!selectedMeal) {
      setSelectionError("Required");
      return;
    }

    setSelectionError("");
    creation.mutate(
      {
        date: getDateKey(date),
        meal_type: mealType,
        meal_id: selectedMeal.id,
      },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title={`Add ${mealTypeLabels[mealType]}`}
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

      <Combobox
        label="Meal"
        inputValue={inputValue}
        options={options}
        selectedOptions={selectedOptions}
        placeholder="Search meals"
        loading={mealsQuery.isPending}
        disabled={creation.isPending}
        error={selectionError || creation.apiFieldErrors.meal_id}
        emptyMessage={
          mealsQuery.isError
            ? "Unable to load meals."
            : meals.length === 0
              ? "No meals available."
              : "No matching meals."
        }
        onInputChange={value => {
          setInputValue(value);
          if (value !== selectedMeal?.name) setSelectedMeal(null);
          setSelectionError("");
          creation.reset();
        }}
        onSelect={option => {
          const meal = meals.find(item => item.id === option.id) ?? null;
          setSelectedMeal(meal);
          setInputValue(meal?.name ?? "");
          setSelectionError("");
          creation.reset();
        }}
      />

      {mealsQuery.isError ? (
        <div
          role="alert"
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            color: colors.danger,
            fontSize: 14,
          }}
        >
          <span>Meals could not be loaded.</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void mealsQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}

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
