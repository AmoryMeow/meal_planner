import { type MealPlan, type MealType } from "@package/plan";
import { hexToRgba, useColors } from "@package/ui";

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const PlanSettingsSummary = ({ plan }: { plan: MealPlan }) => {
  const colors = useColors();

  return (
    <section
      aria-label={`${plan.name} settings`}
      css={{
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderLeft: `5px solid ${plan.color}`,
        borderRadius: 14,
        background: `linear-gradient(90deg, ${hexToRgba(plan.color, 0.08)}, ${colors.surface} 45%)`,
      }}
    >
      <p
        css={{
          margin: "0 0 20px",
          padding: "10px 12px",
          borderRadius: 10,
          background: colors.infoBg,
          color: colors.textPrimary,
          fontSize: 14,
        }}
      >
        Only the group owner can change these settings.
      </p>

      <dl
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 20,
          margin: 0,
        }}
      >
        <div>
          <dt css={termStyles(colors.textSecondary)}>Name</dt>
          <dd css={valueStyles(colors.textPrimary)}>{plan.name}</dd>
        </div>
        <div>
          <dt css={termStyles(colors.textSecondary)}>Color</dt>
          <dd
            css={{
              ...valueStyles(colors.textPrimary),
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              aria-hidden="true"
              css={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: plan.color,
                boxShadow: `0 0 0 2px ${hexToRgba(plan.color, 0.18)}`,
              }}
            />
            {plan.color}
          </dd>
        </div>
        <div>
          <dt css={termStyles(colors.textSecondary)}>Meal sections</dt>
          <dd css={{ ...valueStyles(colors.textPrimary), display: "flex", gap: 6 }}>
            {plan.enabled_meal_types.map(mealType => (
              <span
                key={mealType}
                css={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: colors.chip,
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {mealTypeLabels[mealType]}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
};

const termStyles = (color: string) => ({
  marginBottom: 7,
  color,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
});

const valueStyles = (color: string) => ({
  margin: 0,
  color,
  fontSize: 15,
  fontWeight: 600,
});
