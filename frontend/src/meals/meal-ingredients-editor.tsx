import { type ChangeEvent, useEffect, useId, useState } from "react";

import { hexToRgba, useColors } from "@package/ui";

import { type Ingredient, type MealIngredient } from "./api";
import { IngredientCombobox } from "./ingredient-combobox";
import {
  useCreateMealIngredientMutation,
  useMealIngredientsQuery,
  useUpdateMealIngredientMutation,
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

type SavedIngredientDraft = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  originalQuantity: string;
  originalUnit: string;
};

type DraftErrors = Record<number, { quantity?: string; unit?: string }>;

export const useMealIngredientsEditor = (mealId: number) => {
  const ingredientsQuery = useMealIngredientsQuery(mealId);
  const creation = useCreateMealIngredientMutation(mealId);
  const updating = useUpdateMealIngredientMutation(mealId);
  const [drafts, setDrafts] = useState<IngredientDraft[]>([]);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [savedDrafts, setSavedDrafts] = useState<SavedIngredientDraft[]>([]);
  const [savedDraftErrors, setSavedDraftErrors] = useState<DraftErrors>({});
  const [selectionError, setSelectionError] = useState("");
  const selectedIngredients = drafts.map(draft => draft.ingredient);
  const existingIngredients = ingredientsQuery.data?.results ?? [];

  useEffect(() => {
    if (!ingredientsQuery.data) return;

    setSavedDrafts(current =>
      ingredientsQuery.data.results.map(ingredient => {
        const existing = current.find(draft => draft.id === ingredient.id);
        if (existing && isSavedDraftDirty(existing)) return existing;
        return getSavedDraft(ingredient);
      })
    );
  }, [ingredientsQuery.data]);

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

  const updateSavedDraft = (
    mealIngredientId: number,
    field: "quantity" | "unit",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setSavedDrafts(current =>
      current.map(draft =>
        draft.id === mealIngredientId ? { ...draft, [field]: value } : draft
      )
    );
    setSavedDraftErrors(current => ({
      ...current,
      [mealIngredientId]: { ...current[mealIngredientId], [field]: undefined },
    }));
    updating.reset();
  };

  const validate = (): boolean => {
    const newErrors = validateDrafts(
      drafts.map(draft => ({
        id: draft.ingredient.id,
        quantity: draft.quantity,
        unit: draft.unit,
      }))
    );
    const existingErrors = validateDrafts(savedDrafts);
    setDraftErrors(newErrors);
    setSavedDraftErrors(existingErrors);
    return (
      Object.keys(newErrors).length === 0 && Object.keys(existingErrors).length === 0
    );
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

    for (const draft of savedDrafts.filter(isSavedDraftDirty)) {
      try {
        await updating.mutateAsync({
          mealIngredientId: draft.id,
          input: {
            quantity: draft.quantity,
            unit: draft.unit.trim(),
          },
        });
        setSavedDrafts(current =>
          current.map(currentDraft =>
            currentDraft.id === draft.id
              ? {
                  ...currentDraft,
                  originalQuantity: currentDraft.quantity,
                  originalUnit: currentDraft.unit.trim(),
                  unit: currentDraft.unit.trim(),
                }
              : currentDraft
          )
        );
      } catch {
        return false;
      }
    }
    return true;
  };

  return {
    ingredientsQuery,
    creation,
    updating,
    isPending: creation.isPending || updating.isPending,
    drafts,
    draftErrors,
    savedDrafts,
    savedDraftErrors,
    selectionError,
    selectedIngredients,
    addDraft,
    removeDraft,
    updateDraft,
    updateSavedDraft,
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
    updating,
    isPending,
    drafts,
    draftErrors,
    savedDrafts,
    savedDraftErrors,
    selectionError,
    selectedIngredients,
    addDraft,
    removeDraft,
    updateDraft,
    updateSavedDraft,
    clearDrafts,
  } = editor;
  const apiError =
    Object.values(creation.apiFieldErrors).find(Boolean) ||
    Object.values(updating.apiFieldErrors).find(Boolean);
  const submitError = creation.submitError || updating.submitError;
  const amountCount = savedDrafts.length + drafts.length;

  return (
    <section aria-label="Meal ingredients">
      <IngredientCombobox
        selectedIngredients={selectedIngredients}
        disabled={disabled || isPending}
        error={selectionError}
        onAdd={addDraft}
        onRemove={removeDraft}
        onClear={clearDrafts}
      />

      {amountCount ? (
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
            Amounts ({amountCount})
          </summary>

          <div css={{ display: "flex", flexDirection: "column" }}>
            {savedDrafts.map((draft, index) => (
              <AmountRow
                key={`saved-${draft.id}`}
                name={draft.name}
                quantity={draft.quantity}
                unit={draft.unit}
                errors={savedDraftErrors[draft.id]}
                disabled={disabled || isPending}
                showDivider={index > 0}
                onQuantityChange={event =>
                  updateSavedDraft(draft.id, "quantity", event)
                }
                onUnitChange={event => updateSavedDraft(draft.id, "unit", event)}
              />
            ))}
            {drafts.map((draft, index) => (
              <AmountRow
                key={`new-${draft.ingredient.id}`}
                name={draft.ingredient.name}
                quantity={draft.quantity}
                unit={draft.unit}
                errors={draftErrors[draft.ingredient.id]}
                disabled={disabled || isPending}
                showDivider={savedDrafts.length > 0 || index > 0}
                onQuantityChange={event =>
                  updateDraft(draft.ingredient.id, "quantity", event)
                }
                onUnitChange={event => updateDraft(draft.ingredient.id, "unit", event)}
              />
            ))}
          </div>

          {submitError || apiError ? (
            <div
              role="alert"
              css={{
                padding: "7px 10px",
                borderTop: `1px solid ${colors.divider}`,
                color: colors.danger,
                fontSize: 13,
              }}
            >
              {apiError || submitError}
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
    </section>
  );
};

const AmountRow = ({
  name,
  quantity,
  unit,
  errors,
  disabled,
  showDivider,
  onQuantityChange,
  onUnitChange,
}: {
  name: string;
  quantity: string;
  unit: string;
  errors?: { quantity?: string; unit?: string };
  disabled: boolean;
  showDivider: boolean;
  onQuantityChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUnitChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) => {
  const colors = useColors();

  return (
    <div
      css={{
        display: "grid",
        gridTemplateColumns: "minmax(100px, 1fr) 86px 110px",
        alignItems: "start",
        gap: 8,
        padding: "7px 10px",
        borderTop: showDivider ? `1px solid ${colors.divider}` : 0,
        "@media (max-width: 480px)": {
          gridTemplateColumns: "minmax(80px, 1fr) 72px 90px",
          gap: 6,
          padding: "7px 8px",
        },
      }}
    >
      <strong
        title={name}
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
        {name}
      </strong>
      <CompactInput
        label={`Quantity for ${name}`}
        value={quantity}
        inputMode="decimal"
        onChange={onQuantityChange}
        error={errors?.quantity}
        disabled={disabled}
      />
      <CompactInput
        label={`Unit for ${name}`}
        value={unit}
        placeholder="unit"
        onChange={onUnitChange}
        error={errors?.unit}
        disabled={disabled}
      />
    </div>
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

const validateDrafts = (
  drafts: Array<{ id: number; quantity: string; unit: string }>
): DraftErrors =>
  Object.fromEntries(
    drafts.flatMap(draft => {
      const errors = {
        quantity:
          !Number.isFinite(Number(draft.quantity)) || Number(draft.quantity) <= 0
            ? "Required"
            : undefined,
        unit: draft.unit.trim() ? undefined : "Required",
      };
      return errors.quantity || errors.unit ? [[draft.id, errors]] : [];
    })
  );

const getSavedDraft = (ingredient: MealIngredient): SavedIngredientDraft => ({
  id: ingredient.id,
  name: ingredient.name,
  quantity: ingredient.quantity,
  unit: ingredient.unit,
  originalQuantity: ingredient.quantity,
  originalUnit: ingredient.unit,
});

const isSavedDraftDirty = (draft: SavedIngredientDraft): boolean =>
  draft.quantity !== draft.originalQuantity || draft.unit.trim() !== draft.originalUnit;
