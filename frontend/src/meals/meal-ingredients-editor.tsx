import { type ChangeEvent, useId, useState } from "react";

import { hexToRgba, useColors } from "@package/ui";

import { type Ingredient } from "./api";
import { IngredientCombobox } from "./ingredient-combobox";
import {
  useCreateMealIngredientMutation,
  useMealIngredientsQuery,
} from "./ingredient-queries";

type MealIngredientsEditorProps = {
  editor: MealIngredientsEditorController;
  disabled?: boolean;
};

type IngredientDraft = {
  ingredient: Ingredient;
  quantity: string;
  unit: string;
};

type DraftErrors = Record<number, { quantity?: string; unit?: string }>;

export const useMealIngredientsEditor = (mealId: number) => {
  const ingredientsQuery = useMealIngredientsQuery(mealId);
  const creation = useCreateMealIngredientMutation(mealId);
  const [drafts, setDrafts] = useState<IngredientDraft[]>([]);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [selectionError, setSelectionError] = useState("");
  const selectedIngredients = drafts.map(draft => draft.ingredient);
  const existingIngredients = ingredientsQuery.data?.results ?? [];

  const addDraft = (ingredient: Ingredient) => {
    setSelectionError("");
    if (
      existingIngredients.some(existing => existing.ingredient_id === ingredient.id)
    ) {
      setSelectionError("This ingredient is already added to the meal.");
      return;
    }

    setDrafts(current =>
      current.some(draft => draft.ingredient.id === ingredient.id)
        ? current
        : [...current, { ingredient, quantity: "1", unit: "" }]
    );
  };

  const removeDraft = (ingredientId: number) => {
    setDrafts(current => current.filter(draft => draft.ingredient.id !== ingredientId));
    setDraftErrors(current => {
      const nextErrors = { ...current };
      delete nextErrors[ingredientId];
      return nextErrors;
    });
  };

  const updateDraft = (
    ingredientId: number,
    field: "quantity" | "unit",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setDrafts(current =>
      current.map(draft =>
        draft.ingredient.id === ingredientId ? { ...draft, [field]: value } : draft
      )
    );
    setDraftErrors(current => ({
      ...current,
      [ingredientId]: { ...current[ingredientId], [field]: undefined },
    }));
    creation.reset();
  };

  const validate = (): boolean => {
    const errors = validateDrafts(drafts);
    setDraftErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async (): Promise<boolean> => {
    for (const draft of drafts) {
      try {
        await creation.mutateAsync({
          ingredient_id: draft.ingredient.id,
          quantity: draft.quantity,
          unit: draft.unit.trim(),
        });
        removeDraft(draft.ingredient.id);
      } catch {
        return false;
      }
    }
    return true;
  };

  return {
    ingredientsQuery,
    creation,
    drafts,
    draftErrors,
    selectionError,
    selectedIngredients,
    existingIngredients,
    addDraft,
    removeDraft,
    updateDraft,
    clearDrafts: () => {
      setDrafts([]);
      setDraftErrors({});
      setSelectionError("");
    },
    validate,
    save,
  };
};

type MealIngredientsEditorController = ReturnType<typeof useMealIngredientsEditor>;

export const MealIngredientsEditor = ({
  editor,
  disabled = false,
}: MealIngredientsEditorProps) => {
  const colors = useColors();
  const {
    ingredientsQuery,
    creation,
    drafts,
    draftErrors,
    selectionError,
    selectedIngredients,
    existingIngredients,
    addDraft,
    removeDraft,
    updateDraft,
    clearDrafts,
  } = editor;
  const apiError = Object.values(creation.apiFieldErrors).find(Boolean);

  return (
    <section aria-label="Meal ingredients">
      <IngredientCombobox
        selectedIngredients={selectedIngredients}
        disabled={disabled || creation.isPending}
        error={selectionError}
        onAdd={addDraft}
        onRemove={removeDraft}
        onClear={clearDrafts}
      />

      {drafts.length ? (
        <details
          open
          css={{
            marginTop: 8,
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <summary
            css={{
              padding: "7px 10px",
              background: colors.surfaceAlt,
              color: colors.textPrimary,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              "&:focus-visible": {
                outline: `2px solid ${colors.focus}`,
                outlineOffset: -2,
              },
            }}
          >
            Amounts ({drafts.length})
          </summary>

          <div css={{ display: "flex", flexDirection: "column" }}>
            {drafts.map((draft, index) => (
              <div
                key={draft.ingredient.id}
                css={{
                  display: "grid",
                  gridTemplateColumns: "minmax(100px, 1fr) 86px 110px",
                  alignItems: "start",
                  gap: 8,
                  padding: "7px 10px",
                  borderTop: index ? `1px solid ${colors.divider}` : 0,
                  "@media (max-width: 480px)": {
                    gridTemplateColumns: "minmax(80px, 1fr) 72px 90px",
                    gap: 6,
                    padding: "7px 8px",
                  },
                }}
              >
                <strong
                  title={draft.ingredient.name}
                  css={{
                    alignSelf: "center",
                    overflow: "hidden",
                    color: colors.textPrimary,
                    fontSize: 13,
                    fontWeight: 600,
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {draft.ingredient.name}
                </strong>
                <CompactInput
                  label={`Quantity for ${draft.ingredient.name}`}
                  value={draft.quantity}
                  inputMode="decimal"
                  onChange={event =>
                    updateDraft(draft.ingredient.id, "quantity", event)
                  }
                  error={draftErrors[draft.ingredient.id]?.quantity}
                  disabled={disabled || creation.isPending}
                />
                <CompactInput
                  label={`Unit for ${draft.ingredient.name}`}
                  value={draft.unit}
                  placeholder="unit"
                  onChange={event => updateDraft(draft.ingredient.id, "unit", event)}
                  error={draftErrors[draft.ingredient.id]?.unit}
                  disabled={disabled || creation.isPending}
                />
              </div>
            ))}
          </div>

          {creation.submitError || apiError ? (
            <div
              role="alert"
              css={{
                padding: "7px 10px",
                borderTop: `1px solid ${colors.divider}`,
                color: colors.danger,
                fontSize: 13,
              }}
            >
              {apiError || creation.submitError}
            </div>
          ) : null}
        </details>
      ) : null}

      {ingredientsQuery.isPending ? (
        <p role="status" css={{ margin: "10px 0 0", color: colors.textSecondary }}>
          Loading ingredients…
        </p>
      ) : null}
      {ingredientsQuery.isError ? (
        <div role="alert" css={{ marginTop: 10, color: colors.danger }}>
          Unable to load ingredients.
        </div>
      ) : null}
      {ingredientsQuery.isSuccess && existingIngredients.length ? (
        <ul
          aria-label="Added ingredients"
          css={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            margin: "10px 0 0",
            padding: 0,
            listStyle: "none",
          }}
        >
          {existingIngredients.map(ingredient => (
            <li
              key={ingredient.id}
              css={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "7px 10px",
                borderRadius: 8,
                background: colors.surfaceAlt,
                color: colors.textPrimary,
                fontSize: 13,
              }}
            >
              <span>{ingredient.name}</span>
              <span css={{ color: colors.textSecondary }}>
                {formatQuantity(ingredient.quantity)} {ingredient.unit}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

const CompactInput = ({
  label,
  value,
  inputMode,
  placeholder,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  inputMode?: "decimal";
  placeholder?: string;
  error?: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const colors = useColors();
  const inputId = useId();
  const errorId = useId();

  return (
    <label htmlFor={inputId}>
      <span
        css={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {label}
      </span>
      <input
        id={inputId}
        type="text"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
        css={{
          width: "100%",
          height: 34,
          boxSizing: "border-box",
          padding: "0 8px",
          border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
          borderRadius: 7,
          background: disabled ? colors.surfaceAlt : colors.background,
          color: colors.textPrimary,
          font: "inherit",
          fontSize: 13,
          "&:focus": {
            outline: "none",
            borderColor: error ? colors.danger : colors.primary,
            boxShadow: `0 0 0 2px ${hexToRgba(
              error ? colors.danger : colors.primary,
              0.12
            )}`,
          },
          "&::placeholder": { color: colors.textMuted },
        }}
      />
      <span
        id={errorId}
        aria-hidden={!error || undefined}
        css={{
          display: "block",
          minHeight: 12,
          marginTop: 3,
          color: colors.danger,
          fontSize: 10,
          lineHeight: "12px",
          visibility: error ? "visible" : "hidden",
        }}
      >
        {error ?? "Required"}
      </span>
    </label>
  );
};

const validateDrafts = (drafts: IngredientDraft[]): DraftErrors =>
  Object.fromEntries(
    drafts.flatMap(draft => {
      const errors = {
        quantity:
          !Number.isFinite(Number(draft.quantity)) || Number(draft.quantity) <= 0
            ? "Required"
            : undefined,
        unit: draft.unit.trim() ? undefined : "Required",
      };
      return errors.quantity || errors.unit ? [[draft.ingredient.id, errors]] : [];
    })
  );

const formatQuantity = (quantity: string): string =>
  quantity.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
