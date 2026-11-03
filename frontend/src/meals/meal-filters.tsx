import { Select, useColors } from "@package/ui";

import {
  type MealAccessFilter,
  type MealFilters,
  type MealOrdering,
  type MealSource,
} from "./api";
import { useMealTagFilterOptionsQuery } from "./tag-queries";

type MealFiltersProps = {
  filters: MealFilters;
  onChange: (filters: MealFilters) => void;
};

export const MealFiltersBar = ({ filters, onChange }: MealFiltersProps) => {
  const colors = useColors();
  const tagOptionsQuery = useMealTagFilterOptionsQuery();
  const update = (patch: Partial<MealFilters>) =>
    onChange({ ...filters, ...patch, page: undefined });

  return (
    <section
      aria-label="Meal filters"
      css={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
        paddingBottom: 2,
        overflowX: "auto",
        scrollbarWidth: "thin",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <label css={{ flex: "1 1 220px", minWidth: 180 }}>
        <span css={visuallyHiddenStyles}>Search meals</span>
        <input
          type="search"
          value={filters.search ?? ""}
          placeholder="Search meals"
          onChange={event => update({ search: event.target.value || undefined })}
          css={getControlStyles(colors, { width: "100%" })}
        />
      </label>

      <FilterSelect
        label="Source"
        value={filters.sources?.[0] ?? "all"}
        onChange={value =>
          update({
            sources: value === "all" ? undefined : [value as MealSource],
          })
        }
        options={[
          ["all", "All sources"],
          ["home", "Home"],
          ["restaurant", "Restaurant"],
          ["delivery", "Delivery"],
        ]}
      />

      <FilterSelect
        label="Access"
        value={filters.access ?? "all"}
        onChange={value => update({ access: value as MealAccessFilter })}
        options={[
          ["all", "All meals"],
          ["owned", "My meals"],
          ["shared", "Shared with me"],
        ]}
      />

      <FilterSelect
        label="Tag"
        value={filters.tags?.[0] ?? "all"}
        onChange={value => update({ tags: value === "all" ? undefined : [value] })}
        disabled={tagOptionsQuery.isPending}
        options={[
          ["all", tagOptionsQuery.isPending ? "Loading tags…" : "All tags"],
          ...(tagOptionsQuery.data ?? []).map(
            option => [option.value, option.label] as [string, string]
          ),
        ]}
      />

      <FilterSelect
        label="Sort"
        value={filters.ordering ?? "recent"}
        onChange={value => update({ ordering: value as MealOrdering })}
        options={[
          ["recent", "Recently updated"],
          ["name", "Name"],
        ]}
      />
    </section>
  );
};

const FilterSelect = ({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  disabled?: boolean;
  onChange: (value: string) => void;
}) => {
  return (
    <div css={{ flex: "0 0 auto" }}>
      <Select
        label={label}
        value={value}
        disabled={disabled}
        size="sm"
        hideLabel
        fullWidth={false}
        options={options.map(([optionValue, optionLabel]) => ({
          value: optionValue,
          label: optionLabel,
        }))}
        onChange={onChange}
      />
    </div>
  );
};

const getControlStyles = (
  colors: ReturnType<typeof useColors>,
  extra: Record<string, string> = {}
) => ({
  ...extra,
  height: 36,
  boxSizing: "border-box" as const,
  padding: "0 30px 0 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  font: "inherit",
  fontSize: 13,
  whiteSpace: "nowrap" as const,
  "&:focus-visible": {
    outline: "none",
    borderColor: colors.focus,
    boxShadow: `inset 0 0 0 1px ${colors.focus}`,
  },
  "&:disabled": { opacity: 0.6 },
});

const visuallyHiddenStyles = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};
