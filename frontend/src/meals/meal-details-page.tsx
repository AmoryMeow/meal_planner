import { type FormEvent, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

import { Button, Textarea, useColors, useIsMobile } from "@package/ui";

import { type Meal, type MealSource, type MealTag } from "./api";
import {
  getPageStyles,
  getSectionStyles,
  MealBreadcrumb,
  sectionHeadingStyles,
} from "./create-meal-page";
import {
  MealForm,
  getMealFormData,
  getMealInput,
  type MealFormErrors,
} from "./meal-form";
import {
  MealIngredientsEditor,
  useMealIngredientsEditor,
} from "./meal-ingredients-editor";
import { MealIngredientsSummary } from "./meal-ingredients-summary";
import { MealSharingEditor } from "./meal-sharing-editor";
import { useMealQuery, useUpdateMealMutation } from "./queries";
import { TagCombobox } from "./tag-combobox";

const sourceLabels: Record<MealSource, string> = {
  home: "Home",
  restaurant: "Restaurant",
  delivery: "Delivery",
};

export const MealDetailsPage = () => {
  const { mealId: mealIdParam } = useParams();
  const mealId = Number(mealIdParam);
  const validMealId = Number.isSafeInteger(mealId) && mealId > 0;
  const mealQuery = useMealQuery(validMealId ? mealId : 0);
  const colors = useColors();
  const isMobile = useIsMobile();

  if (!validMealId) return <Navigate to="/meals" replace />;

  return (
    <main css={getPageStyles(isMobile)}>
      <MealBreadcrumb current={mealQuery.data?.name ?? "Meal"} />
      {mealQuery.isPending ? (
        <p role="status" css={{ color: colors.textSecondary }}>
          Loading meal…
        </p>
      ) : null}
      {mealQuery.isError ? (
        <section
          role="alert"
          css={{
            padding: 20,
            border: `1px solid ${colors.danger}`,
            borderRadius: 12,
            color: colors.danger,
          }}
        >
          <p css={{ margin: "0 0 12px" }}>Unable to load this meal.</p>
          <Button variant="outline" size="sm" onClick={() => void mealQuery.refetch()}>
            Retry
          </Button>
        </section>
      ) : null}
      {mealQuery.isSuccess && mealQuery.data.can_edit ? (
        <MealEditor key={mealQuery.data.id} meal={mealQuery.data} />
      ) : null}
      {mealQuery.isSuccess && !mealQuery.data.can_edit ? (
        <ReadOnlyMeal meal={mealQuery.data} />
      ) : null}
    </main>
  );
};

const MealEditor = ({ meal }: { meal: Meal }) => {
  const colors = useColors();
  const [formData, setFormData] = useState(() => getMealFormData(meal));
  const [selectedTags, setSelectedTags] = useState<MealTag[]>(meal.tags);
  const [formErrors, setFormErrors] = useState<MealFormErrors>({});
  const update = useUpdateMealMutation();
  const ingredientsEditor = useMealIngredientsEditor(meal.id, true);
  const isSaving = update.isPending || ingredientsEditor.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.reset();
    const input = getMealInput(
      formData,
      selectedTags.map(tag => tag.id)
    );
    if (!input.name) {
      setFormErrors({ name: "Enter a meal name." });
      return;
    }
    if (!ingredientsEditor.validate()) return;

    setFormErrors({});
    try {
      await update.mutateAsync({ mealId: meal.id, input });
      await ingredientsEditor.save();
    } catch {
      // Each section renders its own mutation error.
    }
  };

  return (
    <form onSubmit={handleSubmit} css={{ display: "grid", gap: 18 }}>
      {!meal.is_owner ? (
        <p
          css={{
            margin: 0,
            padding: "10px 12px",
            borderRadius: 8,
            background: colors.infoBg,
            color: colors.info,
            fontSize: 13,
          }}
        >
          This meal is shared with you with edit access.
        </p>
      ) : null}

      <div
        css={{
          display: "grid",
          gridTemplateColumns: meal.is_owner
            ? "minmax(0, 2fr) minmax(380px, 1fr)"
            : "minmax(0, 1fr)",
          alignItems: "start",
          gap: 18,
          "@media (max-width: 900px)": {
            gridTemplateColumns: "minmax(0, 1fr)",
          },
        }}
      >
        <div css={{ display: "grid", alignContent: "start", gap: 18 }}>
          <section css={getSectionStyles(colors)}>
            <h2 css={sectionHeadingStyles}>Meal details</h2>
            <div css={{ display: "grid", gap: 16 }}>
              <MealForm
                data={formData}
                errors={{ ...update.apiFieldErrors, ...formErrors }}
                disabled={isSaving}
                onChange={data => {
                  setFormData(data);
                  setFormErrors({});
                  update.reset();
                }}
              />
              <TagCombobox
                mealId={meal.id}
                selectedTags={selectedTags}
                disabled={isSaving}
                error={update.apiFieldErrors.tag_ids}
                onChange={tags => {
                  setSelectedTags(tags);
                  update.reset();
                }}
              />
            </div>
          </section>

          <section css={getSectionStyles(colors)}>
            <h2 css={sectionHeadingStyles}>Ingredients</h2>
            <MealIngredientsEditor editor={ingredientsEditor} disabled={isSaving} />
          </section>
        </div>

        {meal.is_owner ? (
          <section css={getSectionStyles(colors)}>
            <MealSharingEditor mealId={meal.id} disabled={isSaving} />
          </section>
        ) : null}
      </div>

      <section css={getSectionStyles(colors)}>
        <h2 css={sectionHeadingStyles}>Recipe</h2>
        <Textarea
          label="Instructions"
          name="instructions"
          value={formData.instructions}
          onChange={event => {
            setFormData(current => ({
              ...current,
              instructions: event.target.value,
            }));
            update.reset();
          }}
          placeholder="Add preparation steps, notes, or a link to the recipe"
          error={update.apiFieldErrors.instructions}
          disabled={isSaving}
          rows={10}
        />
      </section>

      {update.submitError ? (
        <p role="alert" css={{ margin: 0, color: colors.danger }}>
          {update.submitError}
        </p>
      ) : null}

      <div css={{ display: "flex", justifyContent: "flex-end" }}>
        <Button type="submit" size="sm" loading={isSaving}>
          Save changes
        </Button>
      </div>
    </form>
  );
};

const ReadOnlyMeal = ({ meal }: { meal: Meal }) => {
  const colors = useColors();

  return (
    <div css={{ display: "grid", gap: 18 }}>
      <p
        css={{
          margin: 0,
          padding: "10px 12px",
          borderRadius: 8,
          background: colors.infoBg,
          color: colors.info,
          fontSize: 13,
        }}
      >
        This meal was shared with you with view-only access.
      </p>
      <div
        css={{
          display: "grid",
          gap: 18,
        }}
      >
        <section css={getSectionStyles(colors)}>
          <dl
            css={{
              display: "grid",
              gridTemplateColumns: "minmax(90px, auto) 1fr",
              gap: "12px 16px",
              margin: 0,
            }}
          >
            <dt css={termStyles(colors)}>Source</dt>
            <dd css={valueStyles(colors)}>{sourceLabels[meal.source]}</dd>
            <dt css={termStyles(colors)}>Tags</dt>
            <dd css={valueStyles(colors)}>
              {meal.tags.length ? meal.tags.map(tag => tag.name).join(", ") : "—"}
            </dd>
          </dl>
        </section>
        <section css={getSectionStyles(colors)}>
          <MealIngredientsSummary ingredients={meal.ingredients} />
        </section>
      </div>
      <section css={getSectionStyles(colors)}>
        <h2 css={sectionHeadingStyles}>Recipe</h2>
        <p
          css={{
            margin: 0,
            color: meal.instructions ? colors.textPrimary : colors.textSecondary,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {meal.instructions || "No recipe added."}
        </p>
      </section>
    </div>
  );
};

const termStyles = (colors: ReturnType<typeof useColors>) => ({
  color: colors.textSecondary,
  fontSize: 14,
  fontWeight: 600,
});

const valueStyles = (colors: ReturnType<typeof useColors>) => ({
  margin: 0,
  color: colors.textPrimary,
  fontSize: 14,
});
