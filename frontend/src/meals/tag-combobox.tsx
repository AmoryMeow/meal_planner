import { useState } from "react";

import { Combobox, type ComboboxOption } from "@package/ui";

import { type MealTag } from "./api";
import {
  useCreateTagMutation,
  useMealTagSearchQuery,
  useTagSearchQuery,
} from "./tag-queries";

type TagComboboxProps = {
  selectedTags: MealTag[];
  mealId?: number;
  disabled?: boolean;
  error?: string;
  onChange: (tags: MealTag[]) => void;
};

export const TagCombobox = ({
  selectedTags,
  mealId,
  disabled = false,
  error,
  onChange,
}: TagComboboxProps) => {
  const [search, setSearch] = useState("");
  const personalQuery = useTagSearchQuery(mealId ? "" : search);
  const mealQuery = useMealTagSearchQuery(mealId ?? 0, mealId ? search : "");
  const creation = useCreateTagMutation(mealId);
  const activeQuery = mealId ? mealQuery : personalQuery;
  const options = (activeQuery.data?.results ?? []).map(toOption);
  const selectedOptions = selectedTags.map(toOption);

  const selectTag = (option: ComboboxOption) => {
    const tag = activeQuery.data?.results.find(item => item.id === option.id);
    if (tag && !selectedTags.some(item => item.id === tag.id)) {
      onChange([...selectedTags, tag]);
    }
    setSearch("");
  };

  return (
    <Combobox
      label="Tags"
      inputValue={search}
      options={options}
      selectedOptions={selectedOptions}
      multiple
      placeholder="Search or create a tag"
      disabled={disabled}
      loading={activeQuery.isPending}
      creating={creation.isPending}
      error={error || (creation.isError ? "Unable to create tag." : undefined)}
      emptyMessage="No tags found."
      onInputChange={value => {
        setSearch(value);
        creation.reset();
      }}
      onSelect={selectTag}
      onRemove={option =>
        onChange(selectedTags.filter(tag => tag.id !== Number(option.id)))
      }
      onClear={() => onChange([])}
      onCreate={value => {
        creation.mutate(value, {
          onSuccess: tag => {
            onChange([...selectedTags, tag]);
            setSearch("");
          },
        });
      }}
    />
  );
};

const toOption = (tag: MealTag): ComboboxOption => ({
  id: tag.id,
  label: tag.name,
});
