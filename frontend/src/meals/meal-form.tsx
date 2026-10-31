import { type ChangeEvent, useId } from "react";

import { hexToRgba, Input, useColors } from "@package/ui";

import { type CreateMealInput, type Meal, type MealSource } from "./api";

export type MealFormData = {
  name: string;
  source: MealSource;
  tags: string;
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
  tags: "",
};

export const getMealFormData = (meal: Meal): MealFormData => ({
  name: meal.name,
  source: meal.source,
  tags: meal.tags.join(", "),
});

export const getMealInput = (data: MealFormData): CreateMealInput => ({
  name: data.name.trim(),
  source: data.source,
  tags: parseTags(data.tags),
});

export const MealForm = ({
  data,
  errors = {},
  disabled = false,
  onChange,
}: MealFormProps) => {
  const colors = useColors();
  const sourceId = useId();
  const sourceErrorId = useId();

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

      <div>
        <label
          htmlFor={sourceId}
          css={{
            display: "block",
            marginBottom: 8,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Source
        </label>
        <select
          id={sourceId}
          value={data.source}
          onChange={event =>
            onChange({ ...data, source: event.target.value as MealSource })
          }
          disabled={disabled}
          aria-invalid={Boolean(errors.source)}
          aria-describedby={errors.source ? sourceErrorId : undefined}
          css={{
            width: "100%",
            height: 44,
            boxSizing: "border-box",
            padding: "0 12px",
            border: errors.source
              ? `1px solid ${colors.danger}`
              : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: colors.background,
            color: colors.textPrimary,
            font: "inherit",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              borderColor: colors.focus,
            },
          }}
        >
          <option value="home">Home</option>
          <option value="restaurant">Restaurant</option>
          <option value="delivery">Delivery</option>
        </select>
        {errors.source ? (
          <div
            id={sourceErrorId}
            css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
          >
            {errors.source}
          </div>
        ) : null}
      </div>

      <Input
        label="Tags"
        name="tags"
        value={data.tags}
        onChange={handleInputChange}
        placeholder="quick, vegetarian, weekend"
        error={errors.tags}
        disabled={disabled}
      />
    </>
  );
};

const parseTags = (value: string): string[] => [
  ...new Set(
    value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean)
  ),
];
