import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Button,
  getContentContainerStyles,
  Textarea,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type MealTag } from "./api";
import {
  emptyMealFormData,
  getMealInput,
  MealForm,
  type MealFormErrors,
} from "./meal-form";
import { useCreateMealMutation } from "./queries";
import { TagCombobox } from "./tag-combobox";

export const CreateMealPage = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyMealFormData);
  const [selectedTags, setSelectedTags] = useState<MealTag[]>([]);
  const [formErrors, setFormErrors] = useState<MealFormErrors>({});
  const creation = useCreateMealMutation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();
    const input = getMealInput(
      formData,
      selectedTags.map(tag => tag.id)
    );
    if (!input.name) {
      setFormErrors({ name: "Enter a meal name." });
      return;
    }

    setFormErrors({});
    creation.mutate(input, {
      onSuccess: meal => navigate(`/meals/${meal.id}`, { replace: true }),
    });
  };

  return (
    <main css={getPageStyles(isMobile)}>
      <MealBreadcrumb current="New meal" />
      <form onSubmit={handleSubmit} css={{ display: "grid", gap: 18 }}>
        <section css={getSectionStyles(colors)}>
          <h2 css={sectionHeadingStyles}>Meal details</h2>
          <div css={{ display: "grid", gap: 16 }}>
            <MealForm
              data={formData}
              errors={{ ...creation.apiFieldErrors, ...formErrors }}
              disabled={creation.isPending}
              onChange={data => {
                setFormData(data);
                setFormErrors({});
                creation.reset();
              }}
            />
            <TagCombobox
              selectedTags={selectedTags}
              disabled={creation.isPending}
              error={creation.apiFieldErrors.tag_ids}
              onChange={setSelectedTags}
            />
          </div>
        </section>

        <aside
          css={{
            padding: "12px 14px",
            borderRadius: 10,
            background: colors.infoBg,
            color: colors.info,
            fontSize: 13,
          }}
        >
          Save the meal first, then add ingredient quantities and group access on its
          page.
        </aside>

        <section css={getSectionStyles(colors)}>
          <h2 css={sectionHeadingStyles}>Recipe</h2>
          <Textarea
            label="Instructions"
            name="instructions"
            value={formData.instructions}
            onChange={event =>
              setFormData(current => ({
                ...current,
                instructions: event.target.value,
              }))
            }
            placeholder="Add preparation steps, notes, or a link to the recipe"
            error={creation.apiFieldErrors.instructions}
            disabled={creation.isPending}
            rows={8}
          />
        </section>

        {creation.submitError ? (
          <p role="alert" css={{ margin: 0, color: colors.danger }}>
            {creation.submitError}
          </p>
        ) : null}

        <div css={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={creation.isPending}
            onClick={() => navigate("/meals")}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={creation.isPending}>
            Create meal
          </Button>
        </div>
      </form>
    </main>
  );
};

export const MealBreadcrumb = ({ current }: { current: string }) => {
  const colors = useColors();

  return (
    <nav aria-label="Breadcrumb" css={{ marginBottom: 18 }}>
      <ol
        css={{
          display: "flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        <li>
          <Link
            to="/meals"
            css={{
              color: colors.link,
              fontSize: 24,
              fontWeight: 700,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
              "&:focus-visible": {
                outline: `2px solid ${colors.focus}`,
                outlineOffset: 3,
                borderRadius: 4,
              },
            }}
          >
            Meals
          </Link>
        </li>
        <li aria-hidden="true" css={{ color: colors.textMuted }}>
          /
        </li>
        <li aria-current="page">
          <h1
            css={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {current}
          </h1>
        </li>
      </ol>
    </nav>
  );
};

export const getPageStyles = (isMobile: boolean) => ({
  ...getContentContainerStyles(isMobile),
  paddingTop: isMobile ? 20 : 32,
  paddingBottom: isMobile ? "calc(24px + var(--nav-h) + var(--safe-bottom))" : "48px",
});

export const getSectionStyles = (colors: ReturnType<typeof useColors>) => ({
  padding: 18,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  background: colors.surface,
});

export const sectionHeadingStyles = {
  margin: "0 0 16px",
  fontSize: 18,
  lineHeight: 1.3,
};
