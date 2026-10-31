import { useEffect, useState } from "react";

import { Combobox, type ComboboxOption } from "@package/ui";

import { type Ingredient } from "./api";
import {
  useCreateIngredientMutation,
  useIngredientSearchQuery,
} from "./ingredient-queries";

type IngredientComboboxProps = {
  selectedIngredients: Ingredient[];
  disabled?: boolean;
  error?: string;
  onAdd: (ingredient: Ingredient) => void;
  onRemove: (ingredientId: number) => void;
  onClear: () => void;
};

export const IngredientCombobox = ({
  selectedIngredients,
  disabled = false,
  error: externalError,
  onAdd,
  onRemove,
  onClear,
}: IngredientComboboxProps) => {
  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebouncedValue(inputValue.trim(), 250);
  const search = useIngredientSearchQuery(debouncedSearch);
  const creation = useCreateIngredientMutation();
  const waitingForSearch = inputValue.trim() !== debouncedSearch;
  const ingredients = waitingForSearch ? [] : (search.data?.results ?? []);
  const options = ingredients.map(toOption);
  const error =
    externalError ||
    creation.apiFieldErrors.name ||
    creation.submitError ||
    (search.isError ? "Unable to load ingredients. Please try again." : undefined);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    creation.reset();
  };

  const handleSelect = (option: ComboboxOption) => {
    const ingredient = ingredients.find(item => item.id === option.id);
    if (!ingredient) return;

    setInputValue("");
    onAdd(ingredient);
  };

  const handleRemove = (option: ComboboxOption) => {
    if (typeof option.id === "number") onRemove(option.id);
  };

  const handleCreate = (name: string) => {
    setInputValue("");
    creation.mutate(
      { name },
      {
        onSuccess: ingredient => {
          setInputValue("");
          onAdd(ingredient);
        },
        onError: () => setInputValue(name),
      }
    );
  };

  return (
    <Combobox
      label="Ingredients"
      inputValue={inputValue}
      options={options}
      selectedOptions={selectedIngredients.map(toOption)}
      multiple
      placeholder="Search or create an ingredient"
      disabled={disabled}
      loading={waitingForSearch || search.isPending}
      creating={creation.isPending}
      error={error}
      emptyMessage="No ingredients found."
      onInputChange={handleInputChange}
      onSelect={handleSelect}
      onRemove={handleRemove}
      onClear={onClear}
      onCreate={handleCreate}
    />
  );
};

const toOption = (ingredient: Ingredient): ComboboxOption => ({
  id: ingredient.id,
  label: ingredient.name,
});

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => setDebouncedValue(value), delay);
    return () => globalThis.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};
