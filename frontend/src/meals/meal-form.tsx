import { type ChangeEvent } from "react";

import { Input, Select } from "@package/ui";

import { type CreateMealInput, type Meal, type MealSource } from "./api";

export type MealFormData = {
  name: string;
  source: MealSource;
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
  instructions: "",
};

export const getMealFormData = (meal: Meal): MealFormData => ({
  name: meal.name,
  source: meal.source,
  instructions: meal.instructions,
});

export const getMealInput = (
  data: MealFormData,
  tagIds: number[]
): CreateMealInput => ({
  name: data.name.trim(),
  source: data.source,
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
    </>
  );
};
