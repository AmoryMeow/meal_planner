import { useId } from "react";

import { hexToRgba, useColors } from "@package/ui";

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
        Meal type
      </label>
      <select
        id={selectId}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={event => onChange(event.target.value as MealType)}
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
            outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
            borderColor: colors.focus,
          },
        }}
      >
        <option value="breakfast">Breakfast</option>
        <option value="lunch">Lunch</option>
        <option value="dinner">Dinner</option>
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
