import { useId } from "react";

import { useColors } from "@package/ui";

import { type MealIngredient } from "./api";

export const MealIngredientsSummary = ({
  ingredients,
}: {
  ingredients: MealIngredient[];
}) => {
  const colors = useColors();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        css={{ margin: "0 0 10px", color: colors.textPrimary, fontSize: 17 }}
      >
        Ingredients
      </h2>
      {ingredients.length ? (
        <ul
          css={{
            margin: 0,
            padding: 0,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            listStyle: "none",
            overflow: "hidden",
          }}
        >
          {ingredients.map((ingredient, index) => (
            <li
              key={ingredient.id}
              css={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 12px",
                borderTop: index ? `1px solid ${colors.divider}` : 0,
                color: colors.textPrimary,
                fontSize: 14,
              }}
            >
              <span>{ingredient.name}</span>
              <span css={{ color: colors.textSecondary, whiteSpace: "nowrap" }}>
                {ingredient.quantity} {ingredient.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
          No ingredients.
        </p>
      )}
    </section>
  );
};
