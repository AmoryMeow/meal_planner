import { useEffect, useRef, useState } from "react";

import { Button, useColors, useIsMobile } from "@package/ui";

import { type Meal, type MealSource } from "./api";
import { CreateMealDialog } from "./create-meal-dialog";
import { EditMealDialog } from "./edit-meal-dialog";
import { useMealsQuery } from "./queries";

const sourceLabels: Record<MealSource, string> = {
  home: "Home",
  restaurant: "Restaurant",
  delivery: "Delivery",
};

export const Meals = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const mealsQuery = useMealsQuery();
  const createMealDialogRef = useRef<HTMLDialogElement>(null);
  const editMealDialogRef = useRef<HTMLDialogElement>(null);
  const [mealToEdit, setMealToEdit] = useState<Meal | null>(null);

  useEffect(() => {
    const dialog = editMealDialogRef.current;
    if (mealToEdit && dialog && !dialog.open) dialog.showModal();
  }, [mealToEdit]);

  return (
    <main
      css={{
        width: "100%",
        maxWidth: 1200,
        boxSizing: "border-box",
        margin: "0 auto",
        padding: isMobile ? "20px 16px" : "32px 24px",
        paddingBottom: isMobile
          ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
          : "48px",
      }}
    >
      <header
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          css={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 12px",
          }}
        >
          <h1
            css={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: 24,
              lineHeight: 1.25,
            }}
          >
            Meals
          </h1>
          <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
            Your personal collection of meals and recipes.
          </p>
        </div>

        <Button
          size="sm"
          icon={<PlusIcon />}
          onClick={() => createMealDialogRef.current?.showModal()}
        >
          Add meal
        </Button>
      </header>

      <CreateMealDialog dialogRef={createMealDialogRef} />
      {mealToEdit ? (
        <EditMealDialog
          dialogRef={editMealDialogRef}
          meal={mealToEdit}
          onClose={() => setMealToEdit(null)}
        />
      ) : null}

      {mealsQuery.isPending ? <MealsLoading /> : null}
      {mealsQuery.isError ? (
        <MealsError onRetry={() => void mealsQuery.refetch()} />
      ) : null}
      {mealsQuery.isSuccess && mealsQuery.data.results.length === 0 ? (
        <MealsEmpty />
      ) : null}
      {mealsQuery.isSuccess && mealsQuery.data.results.length > 0 ? (
        <section aria-label="Meal library">
          <div
            css={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 16,
            }}
          >
            {mealsQuery.data.results.map(meal => (
              <MealCard key={meal.id} meal={meal} onEdit={setMealToEdit} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
};

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const MealCard = ({ meal, onEdit }: { meal: Meal; onEdit: (meal: Meal) => void }) => {
  const colors = useColors();
  const ingredientCount = meal.ingredients.length;

  return (
    <article
      css={{
        minHeight: 180,
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        "&:hover": {
          borderColor: colors.primary,
          transform: "translateY(-1px)",
        },
      }}
    >
      <button
        type="button"
        aria-label={`Edit ${meal.name}`}
        onClick={() => onEdit(meal)}
        css={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          width: "100%",
          padding: 0,
          border: 0,
          borderRadius: "inherit",
          background: "transparent",
          cursor: "pointer",
          "&:focus": {
            outline: "none",
          },
          "&:focus-visible": {
            outline: `3px solid ${colors.focus}`,
            outlineOffset: 2,
          },
        }}
      />

      <div
        css={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2
          css={{
            margin: 0,
            color: colors.textPrimary,
            fontSize: 20,
            lineHeight: 1.3,
          }}
        >
          {meal.name}
        </h2>
        <span
          css={{
            flexShrink: 0,
            padding: "4px 8px",
            borderRadius: 999,
            background: colors.chip,
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {sourceLabels[meal.source]}
        </span>
      </div>

      {meal.tags.length > 0 ? (
        <ul
          aria-label="Tags"
          css={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {meal.tags.map((tag, index) => (
            <li
              key={`${tag}-${index}`}
              css={{
                padding: "4px 8px",
                borderRadius: 999,
                background: colors.chip,
                color: colors.textSecondary,
                fontSize: 12,
              }}
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      <p css={{ margin: "auto 0 0", color: colors.textSecondary, fontSize: 14 }}>
        {ingredientCount === 1 ? "1 ingredient" : `${ingredientCount} ingredients`}
      </p>
    </article>
  );
};

const MealsLoading = () => {
  const colors = useColors();

  return (
    <div
      role="status"
      aria-label="Loading meals"
      css={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
        gap: 16,
      }}
    >
      {[0, 1, 2].map(item => (
        <div
          key={item}
          aria-hidden="true"
          css={{
            height: 180,
            borderRadius: 16,
            background: colors.surfaceAlt,
            animation: "meals-pulse 1.2s ease-in-out infinite alternate",
            "@keyframes meals-pulse": {
              from: { opacity: 0.55 },
              to: { opacity: 1 },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />
      ))}
    </div>
  );
};

const MealsError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();

  return (
    <section
      role="alert"
      css={{
        padding: 24,
        border: `1px solid ${colors.danger}`,
        borderRadius: 16,
        background: colors.surface,
        color: colors.danger,
      }}
    >
      <h2 css={{ margin: 0, fontSize: 18 }}>Unable to load meals</h2>
      <p css={{ margin: "8px 0 16px" }}>Please try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
  );
};

const MealsEmpty = () => {
  const colors = useColors();

  return (
    <section
      css={{
        padding: "48px 24px",
        border: `1px dashed ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        textAlign: "center",
      }}
    >
      <h2 css={{ margin: 0, color: colors.textPrimary, fontSize: 20 }}>No meals yet</h2>
      <p css={{ margin: "8px 0 0", color: colors.textSecondary }}>
        Your saved meals will appear here.
      </p>
    </section>
  );
};
