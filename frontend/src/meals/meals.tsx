import { useEffect, useRef, useState } from "react";

import {
  Button,
  getContentContainerStyles,
  PlusIcon,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type Meal, type MealSource } from "./api";
import { CreateMealDialog } from "./create-meal-dialog";
import { EditMealDialog } from "./edit-meal-dialog";
import { MealDetailsDialog } from "./meal-details-dialog";
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
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    const dialog = editMealDialogRef.current;
    if (selectedMeal && dialog && !dialog.open) dialog.showModal();
  }, [selectedMeal]);

  return (
    <main
      css={{
        ...getContentContainerStyles(isMobile),
        paddingTop: isMobile ? 20 : 32,
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
            Your meals and recipes shared with you.
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
      {selectedMeal ? (
        selectedMeal.can_edit ? (
          <EditMealDialog
            dialogRef={editMealDialogRef}
            meal={selectedMeal}
            onClose={() => setSelectedMeal(null)}
          />
        ) : (
          <MealDetailsDialog
            dialogRef={editMealDialogRef}
            meal={selectedMeal}
            onClose={() => setSelectedMeal(null)}
          />
        )
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
              <MealCard key={meal.id} meal={meal} onOpen={setSelectedMeal} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
};

const MealCard = ({ meal, onOpen }: { meal: Meal; onOpen: (meal: Meal) => void }) => {
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
        aria-label={`${meal.can_edit ? "Edit" : "View"} ${meal.name}`}
        onClick={() => onOpen(meal)}
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
        <div
          css={{
            display: "flex",
            alignItems: "flex-end",
            flexDirection: "column",
            flexShrink: 0,
            gap: 6,
          }}
        >
          <span
            css={{
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
          {!meal.is_owner ? (
            <span
              css={{
                padding: "4px 8px",
                borderRadius: 999,
                background: meal.can_edit ? colors.accentBg : colors.infoBg,
                color: meal.can_edit ? colors.accent : colors.info,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {meal.can_edit ? "Shared · Can edit" : "Shared · Read only"}
            </span>
          ) : null}
        </div>
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
        Your meals and recipes shared with you will appear here.
      </p>
    </section>
  );
};
