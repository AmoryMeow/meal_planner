import { useMemo, useState } from "react";

import { Button, Combobox, useColors } from "@package/ui";

import { useMealsQuery } from "./queries";

export type MealOption = {
  id: number;
  label: string;
};

type MealComboboxProps = {
  value: MealOption | null;
  onChange: (value: MealOption | null) => void;
  disabled?: boolean;
  error?: string;
};

export const MealCombobox = ({
  value,
  onChange,
  disabled = false,
  error,
}: MealComboboxProps) => {
  const colors = useColors();
  const mealsQuery = useMealsQuery();
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const meals = useMemo(() => mealsQuery.data?.results ?? [], [mealsQuery.data]);
  const normalizedInput =
    inputValue === value?.label ? "" : inputValue.trim().toLocaleLowerCase();
  const options = meals
    .filter(meal => meal.name.toLocaleLowerCase().includes(normalizedInput))
    .map(meal => ({ id: meal.id, label: meal.name }));

  return (
    <>
      <Combobox
        label="Meal"
        inputValue={inputValue}
        options={options}
        selectedOptions={value ? [value] : []}
        placeholder="Search meals"
        loading={mealsQuery.isPending}
        disabled={disabled}
        error={error}
        emptyMessage={
          mealsQuery.isError
            ? "Unable to load meals."
            : meals.length === 0
              ? "No meals available."
              : "No matching meals."
        }
        onInputChange={input => {
          setInputValue(input);
          if (input !== value?.label) onChange(null);
        }}
        onSelect={option => {
          const mealOption = options.find(item => item.id === option.id);
          if (!mealOption) return;

          setInputValue(mealOption.label);
          onChange(mealOption);
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
    </>
  );
};
