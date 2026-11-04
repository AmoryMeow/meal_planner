import { useEffect, useState } from "react";

import { PlanSelector, usePlansQuery } from "@package/plan";
import {
  Button,
  getContentContainerStyles,
  SegmentedControl,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type ShoppingListItem } from "./api";
import { useShoppingListQuery } from "./queries";

export { getShoppingList, type ShoppingListItem, type ShoppingListQuery } from "./api";
export { shoppingListQueryKeys, useShoppingListQuery } from "./queries";

const quantityFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

type PeriodPreset = "this-week" | "next-week" | "custom";

export const ShoppingList = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const [dateFrom, setDateFrom] = useState(() => getDefaultRange().dateFrom);
  const [dateTo, setDateTo] = useState(() => getDefaultRange().dateTo);
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([]);
  const plansQuery = usePlansQuery();
  const validRange = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const shoppingListQuery = useShoppingListQuery(
    { dateFrom, dateTo, planIds: selectedPlanIds },
    validRange
  );
  const hasPlanSelection = selectedPlanIds.length > 0;
  const periodPreset = getPeriodPreset(dateFrom, dateTo);

  const selectPeriod = (preset: PeriodPreset) => {
    if (preset === "custom") return;
    const range = getWeekRange(preset === "next-week" ? 1 : 0);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  };

  useEffect(() => {
    if (!plansQuery.data?.length) return;

    setSelectedPlanIds(current => {
      const availableSelection = plansQuery.data
        .filter(plan => current.includes(plan.id))
        .map(plan => plan.id);
      const nextSelection = availableSelection.length
        ? availableSelection
        : plansQuery.data.map(plan => plan.id);

      return areNumberArraysEqual(current, nextSelection) ? current : nextSelection;
    });
  }, [plansQuery.data]);

  const isLoading =
    plansQuery.isPending ||
    (plansQuery.isSuccess &&
      plansQuery.data.length > 0 &&
      (!hasPlanSelection || shoppingListQuery.isPending));
  const isError = plansQuery.isError || (hasPlanSelection && shoppingListQuery.isError);

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
      <header css={{ marginBottom: 16 }}>
        <h1 css={{ margin: 0, color: colors.textPrimary, fontSize: 24 }}>
          Shopping list
        </h1>
        <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
          Ingredients calculated from the meals in your plans.
        </p>
      </header>

      <section
        aria-label="Shopping list filters"
        css={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: validRange ? 16 : 6,
          paddingBottom: 2,
          overflowX: "auto",
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <SegmentedControl<PeriodPreset>
          ariaLabel="Quick period"
          value={periodPreset}
          size="sm"
          options={[
            { value: "this-week", label: "This week" },
            { value: "next-week", label: "Next week" },
          ]}
          onChange={selectPeriod}
        />

        <label css={{ flex: "0 0 auto" }}>
          <span css={visuallyHiddenStyles}>Start date</span>
          <input
            type="date"
            value={dateFrom}
            onChange={event => setDateFrom(event.target.value)}
            css={getFilterControlStyles(colors)}
          />
        </label>
        <span aria-hidden="true" css={{ color: colors.textMuted }}>
          –
        </span>
        <label css={{ flex: "0 0 auto" }}>
          <span css={visuallyHiddenStyles}>End date</span>
          <input
            type="date"
            value={dateTo}
            aria-invalid={!validRange}
            onChange={event => setDateTo(event.target.value)}
            css={getFilterControlStyles(colors, !validRange)}
          />
        </label>

        {plansQuery.data && plansQuery.data.length > 1 ? (
          <div css={{ flex: "0 0 auto" }}>
            <PlanSelector
              plans={plansQuery.data}
              selectedPlanIds={selectedPlanIds}
              size="sm"
              onChange={setSelectedPlanIds}
            />
          </div>
        ) : null}
      </section>

      {!validRange ? (
        <p
          role="alert"
          css={{ margin: "0 0 16px", color: colors.danger, fontSize: 12 }}
        >
          Choose an end date on or after the start date.
        </p>
      ) : null}

      {isLoading ? (
        <p role="status" css={{ color: colors.textSecondary }}>
          Building your shopping list…
        </p>
      ) : null}

      {isError ? (
        <section
          role="alert"
          css={{
            padding: 18,
            border: `1px solid ${colors.danger}`,
            borderRadius: 12,
            color: colors.danger,
          }}
        >
          <p css={{ margin: "0 0 12px" }}>Unable to load the shopping list.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (plansQuery.isError) void plansQuery.refetch();
              if (shoppingListQuery.isError) void shoppingListQuery.refetch();
            }}
          >
            Try again
          </Button>
        </section>
      ) : null}

      {!isLoading && !isError && shoppingListQuery.data?.length === 0 ? (
        <section
          css={{
            padding: "32px 20px",
            border: `1px dashed ${colors.border}`,
            borderRadius: 12,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          No ingredients are planned for this period.
        </section>
      ) : null}

      {!isLoading && !isError && shoppingListQuery.data?.length ? (
        <ShoppingItems items={shoppingListQuery.data} />
      ) : null}
    </main>
  );
};

const ShoppingItems = ({ items }: { items: ShoppingListItem[] }) => {
  const colors = useColors();

  return (
    <section aria-labelledby="shopping-items-heading">
      <h2
        id="shopping-items-heading"
        css={{ margin: "0 0 8px", color: colors.textPrimary, fontSize: 16 }}
      >
        Ingredients
      </h2>
      <ul
        css={{
          margin: 0,
          padding: 0,
          overflow: "hidden",
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          background: colors.surface,
          listStyle: "none",
        }}
      >
        {items.map(item => (
          <li
            key={`${item.name.toLocaleLowerCase()}-${item.unit.toLocaleLowerCase()}`}
            css={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
              minHeight: 40,
              padding: "8px 12px",
              borderBottom: `1px solid ${colors.divider}`,
              "&:last-child": { borderBottom: 0 },
            }}
          >
            <span css={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>
              {item.name}
            </span>
            <span css={{ flex: "0 0 auto", color: colors.textSecondary, fontSize: 13 }}>
              {formatQuantity(item.quantity)} {item.unit}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

const formatQuantity = (quantity: string) => {
  const value = Number(quantity);
  return Number.isFinite(value) ? quantityFormatter.format(value) : quantity;
};

const getDefaultRange = () => getWeekRange(0);

const getWeekRange = (weekOffset: number) => {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { dateFrom: getDateKey(monday), dateTo: getDateKey(sunday) };
};

const getPeriodPreset = (dateFrom: string, dateTo: string): PeriodPreset => {
  const thisWeek = getWeekRange(0);
  if (dateFrom === thisWeek.dateFrom && dateTo === thisWeek.dateTo) {
    return "this-week";
  }
  const nextWeek = getWeekRange(1);
  if (dateFrom === nextWeek.dateFrom && dateTo === nextWeek.dateTo) {
    return "next-week";
  }
  return "custom";
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const areNumberArraysEqual = (first: number[], second: number[]) =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

const getFilterControlStyles = (
  colors: ReturnType<typeof useColors>,
  invalid = false
) => ({
  width: 142,
  height: 36,
  boxSizing: "border-box" as const,
  padding: "0 8px",
  border: `1px solid ${invalid ? colors.danger : colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  font: "inherit",
  fontSize: 13,
  "&:focus-visible": {
    outline: "none",
    borderColor: invalid ? colors.danger : colors.focus,
    boxShadow: `inset 0 0 0 1px ${invalid ? colors.danger : colors.focus}`,
  },
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
