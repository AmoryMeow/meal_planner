import { type FormEvent, useEffect, useState } from "react";

import {
  type MealPlan,
  type MealType,
  type UpdatePlanInput,
  useUpdatePlanMutation,
} from "@package/plan";
import {
  Button,
  ColorInput,
  HEX_COLOR_PATTERN,
  hexToRgba,
  Input,
  useColors,
} from "@package/ui";

const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

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
  const previewColor = HEX_COLOR_PATTERN.test(color) ? color : plan.color;
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
    if (!HEX_COLOR_PATTERN.test(normalizedColor)) nextErrors.color = "Use #RRGGBB";
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
        <ColorInput
          name="plan-color"
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
