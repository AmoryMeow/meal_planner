import { type RefObject, useId } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type Meal, type MealIngredient, type MealSource } from "./api";

const sourceLabels: Record<MealSource, string> = {
  home: "Home",
  restaurant: "Restaurant",
  delivery: "Delivery",
};

type MealDetailsDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  meal: Meal;
  onClose: () => void;
};

export const MealDetailsDialog = ({
  dialogRef,
  meal,
  onClose,
}: MealDetailsDialogProps) => {
  const colors = useColors();

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Meal details"
      onClose={onClose}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => dialogRef.current?.close()}
        >
          Close
        </Button>
      }
    >
      <p
        css={{
          margin: 0,
          padding: "10px 12px",
          borderRadius: 8,
          background: colors.infoBg,
          color: colors.info,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        This meal was shared with you with read-only access.
      </p>

      <dl
        css={{
          display: "grid",
          gridTemplateColumns: "minmax(90px, auto) 1fr",
          gap: "10px 16px",
          margin: 0,
        }}
      >
        <DetailTerm>Name</DetailTerm>
        <DetailValue>{meal.name}</DetailValue>
        <DetailTerm>Source</DetailTerm>
        <DetailValue>{sourceLabels[meal.source]}</DetailValue>
        <DetailTerm>Tags</DetailTerm>
        <DetailValue>{meal.tags.length ? meal.tags.join(", ") : "—"}</DetailValue>
      </dl>

      <MealIngredientsSummary ingredients={meal.ingredients} />
    </Dialog>
  );
};

export const MealIngredientsSummary = ({
  ingredients,
}: {
  ingredients: MealIngredient[];
}) => {
  const colors = useColors();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        css={{ margin: "0 0 8px", color: colors.textPrimary, fontSize: 14 }}
      >
        Ingredients
      </h3>
      {ingredients.length ? (
        <ul
          css={{
            margin: 0,
            padding: 0,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
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
                padding: "8px 10px",
                borderTop: index ? `1px solid ${colors.divider}` : 0,
                color: colors.textPrimary,
                fontSize: 13,
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

const DetailTerm = ({ children }: { children: string }) => {
  const colors = useColors();
  return (
    <dt css={{ color: colors.textSecondary, fontSize: 14, fontWeight: 600 }}>
      {children}
    </dt>
  );
};

const DetailValue = ({ children }: { children: string }) => {
  const colors = useColors();
  return (
    <dd css={{ margin: 0, color: colors.textPrimary, fontSize: 14 }}>{children}</dd>
  );
};
