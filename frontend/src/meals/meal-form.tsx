import { type ChangeEvent } from "react";

import { Input, Select } from "@package/ui";

import { type CreateMealInput, type Meal, type MealSource } from "./api";

export type MealFormData = {
  name: string;
  source: MealSource;
  servings: string;
  instructions: string;
};

export type MealFormErrors = Partial<Record<keyof MealFormData, string>>;

type MealFormProps = {
  data: MealFormData;
  errors?: MealFormErrors;
  disabled?: boolean;
  onChange: (data: MealFormData) => void;
};

export const emptyMealFormData: MealFormData = {
  name: "",
  source: "home",
  servings: "1",
  instructions: "",
};

export const getMealFormData = (meal: Meal): MealFormData => ({
  name: meal.name,
  source: meal.source,
  servings: String(meal.servings),
  instructions: meal.instructions,
});

export const validateMealFormData = (data: MealFormData): MealFormErrors => {
  const errors: MealFormErrors = {};
  const servings = Number(data.servings);

  if (!data.name.trim()) errors.name = "Enter a meal name.";
  if (!data.servings) errors.servings = "Required";
  else if (!Number.isInteger(servings) || servings < 1) {
    errors.servings = "Enter a whole number greater than zero.";
  }

  return errors;
};

export const getMealInput = (
  data: MealFormData,
  tagIds: number[]
): CreateMealInput => ({
  name: data.name.trim(),
  source: data.source,
  servings: Number(data.servings),
  instructions: data.instructions.trim(),
  tag_ids: tagIds,
});

export const MealForm = ({
  data,
  errors = {},
  disabled = false,
  onChange,
}: MealFormProps) => {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <>
      <Input
        label="Name"
        name="name"
        value={data.name}
        onChange={handleInputChange}
        placeholder="For example, vegetable soup"
        error={errors.name}
        disabled={disabled}
        required
      />

      <div
        css={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(140px, 0.5fr)",
          gap: 16,
          "@media (max-width: 560px)": { gridTemplateColumns: "minmax(0, 1fr)" },
        }}
      >
        <Select
          label="Source"
          value={data.source}
          options={[
            { value: "home", label: "Home" },
            { value: "delivery", label: "Delivery" },
            { value: "restaurant", label: "Restaurant" },
          ]}
          disabled={disabled}
          error={errors.source}
          onChange={source => onChange({ ...data, source: source as MealSource })}
        />

        <Input
          label="Recipe yield"
          type="number"
          name="servings"
          value={data.servings}
          onChange={handleInputChange}
          error={errors.servings}
          disabled={disabled}
          min={1}
          step={1}
          required
        />
      </div>
    </>
  );
};
