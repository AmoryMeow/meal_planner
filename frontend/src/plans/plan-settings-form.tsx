import { type FormEvent, useEffect, useId, useState } from "react";

import {
  type MealPlan,
  type MealType,
  type UpdatePlanInput,
  useUpdatePlanMutation,
} from "@package/plan";
import { Button, hexToRgba, Input, useColors } from "@package/ui";

const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

const colorPattern = /^#[0-9A-Fa-f]{6}$/;

type PlanFormErrors = Partial<Record<keyof UpdatePlanInput, string>>;

export const PlanSettingsForm = ({ plan }: { plan: MealPlan }) => {
  const colors = useColors();
  const mutation = useUpdatePlanMutation(plan.id);
  const [name, setName] = useState(plan.name);
  const [color, setColor] = useState(plan.color);
  const [mealTypes, setMealTypes] = useState<MealType[]>(plan.enabled_meal_types);
  const [formErrors, setFormErrors] = useState<PlanFormErrors>({});

  useEffect(() => {
    setName(plan.name);
    setColor(plan.color);
    setMealTypes(plan.enabled_meal_types);
    setFormErrors({});
  }, [plan.color, plan.enabled_meal_types, plan.name]);

  const isDirty =
    name !== plan.name ||
    color !== plan.color ||
    mealTypes.length !== plan.enabled_meal_types.length ||
    mealTypes.some((mealType, index) => plan.enabled_meal_types[index] !== mealType);
  const previewColor = colorPattern.test(color) ? color : plan.color;
  const mealTypesError =
    formErrors.enabled_meal_types ?? mutation.apiFieldErrors.enabled_meal_types;

  const clearStatus = (field: keyof UpdatePlanInput) => {
    mutation.reset();
    setFormErrors(current => ({ ...current, [field]: undefined }));
  };

  const handleMealTypeChange = (mealType: MealType, checked: boolean) => {
    clearStatus("enabled_meal_types");
    setMealTypes(current =>
      checked
        ? mealTypeOptions
            .map(option => option.value)
            .filter(option => current.includes(option) || option === mealType)
        : current.filter(option => option !== mealType)
    );
  };

  const handleReset = () => {
    mutation.reset();
    setName(plan.name);
    setColor(plan.color);
    setMealTypes(plan.enabled_meal_types);
    setFormErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.reset();

    const normalizedName = name.trim();
    const normalizedColor = color.toUpperCase();
    const nextErrors: PlanFormErrors = {};

    if (!normalizedName) nextErrors.name = "Required";
    if (!colorPattern.test(normalizedColor)) nextErrors.color = "Use #RRGGBB";
    if (mealTypes.length === 0) nextErrors.enabled_meal_types = "Required";

    setFormErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setName(normalizedName);
    setColor(normalizedColor);
    mutation.mutate({
      name: normalizedName,
      color: normalizedColor,
      enabled_meal_types: mealTypes,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      css={{
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderLeft: `5px solid ${previewColor}`,
        borderRadius: 14,
        background: `linear-gradient(90deg, ${hexToRgba(previewColor, 0.08)}, ${colors.surface} 45%)`,
      }}
    >
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: 18,
          marginBottom: 22,
        }}
      >
        <Input
          label="Name"
          name="plan-name"
          value={name}
          required
          disabled={mutation.isPending}
          error={formErrors.name ?? mutation.apiFieldErrors.name}
          onChange={event => {
            clearStatus("name");
            setName(event.target.value);
          }}
        />
        <ColorField
          value={color}
          disabled={mutation.isPending}
          error={formErrors.color ?? mutation.apiFieldErrors.color}
          onChange={value => {
            clearStatus("color");
            setColor(value);
          }}
        />
      </div>

      <fieldset
        disabled={mutation.isPending}
        css={{ margin: 0, padding: 0, border: 0 }}
      >
        <legend
          css={{
            marginBottom: 10,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Meal sections
        </legend>
        <div css={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {mealTypeOptions.map(option => {
            const isChecked = mealTypes.includes(option.value);

            return (
              <label
                key={option.value}
                css={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 38,
                  padding: "0 12px",
                  border: `1px solid ${isChecked ? previewColor : colors.border}`,
                  borderRadius: 10,
                  background: isChecked ? hexToRgba(previewColor, 0.1) : colors.surface,
                  color: colors.textPrimary,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: mutation.isPending ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={event =>
                    handleMealTypeChange(option.value, event.target.checked)
                  }
                  css={{ width: 16, height: 16, accentColor: previewColor }}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {mealTypesError ? (
          <p
            role="alert"
            css={{ margin: "7px 0 0", color: colors.danger, fontSize: 12 }}
          >
            {mealTypesError}
          </p>
        ) : null}
      </fieldset>

      <div
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 24,
        }}
      >
        <div aria-live="polite" css={{ marginRight: "auto", fontSize: 13 }}>
          {mutation.isSuccess ? (
            <span css={{ color: colors.success }}>Changes saved.</span>
          ) : null}
          {mutation.submitError ? (
            <span role="alert" css={{ color: colors.danger }}>
              {mutation.submitError}
            </span>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!isDirty || mutation.isPending}
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button
          type="submit"
          size="sm"
          loading={mutation.isPending}
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
};

const ColorField = ({
  value,
  disabled,
  error,
  onChange,
}: {
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) => {
  const colors = useColors();
  const fieldId = useId();
  const errorId = useId();
  const pickerValue = colorPattern.test(value) ? value : "#000000";

  return (
    <div>
      <label
        htmlFor={fieldId}
        css={{
          display: "block",
          marginBottom: 8,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Color
      </label>
      <div css={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={pickerValue}
          disabled={disabled}
          aria-label="Choose plan color"
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value.toUpperCase())}
          css={{
            width: 48,
            height: 44,
            flex: "0 0 auto",
            boxSizing: "border-box",
            padding: 4,
            border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: colors.background,
            cursor: disabled ? "not-allowed" : "pointer",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              outlineOffset: 1,
            },
          }}
        />
        <input
          id={fieldId}
          type="text"
          name="plan-color"
          value={value}
          disabled={disabled}
          required
          maxLength={7}
          placeholder="#0EA5E9"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value)}
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
            fontSize: 15,
            textTransform: "uppercase",
            "&:focus": {
              outline: "none",
              borderColor: error ? colors.danger : colors.primary,
              boxShadow: `0 0 0 3px ${hexToRgba(error ? colors.danger : colors.primary, 0.1)}`,
            },
          }}
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          css={{ margin: "6px 0 0", color: colors.danger, fontSize: 12 }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
