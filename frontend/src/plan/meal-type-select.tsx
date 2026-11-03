import { Select } from "@package/ui";

import { type MealType } from "./types";

type MealTypeSelectProps = {
  value: MealType;
  disabled?: boolean;
  error?: string;
  onChange: (mealType: MealType) => void;
};

export const MealTypeSelect = ({
  value,
  disabled = false,
  error,
  onChange,
}: MealTypeSelectProps) => {
  return (
    <Select
      label="Meal type"
      value={value}
      disabled={disabled}
      error={error}
      options={[
        { value: "breakfast", label: "Breakfast" },
        { value: "lunch", label: "Lunch" },
        { value: "dinner", label: "Dinner" },
      ]}
      onChange={mealType => onChange(mealType as MealType)}
    />
  );
};
