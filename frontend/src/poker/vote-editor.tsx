import { useEffect, useState } from "react";

import { Button, HorizontalScroller, Select, useColors } from "@package/ui";

import { type PokerMeal, type PokerMealQuery, type PokerParticipant } from "./api";
import { usePokerMealsQuery, useSubmitPokerVotesMutation } from "./queries";

type VoteEditorProps = {
  sessionId: number;
  participant: PokerParticipant;
};

type MealSource = NonNullable<PokerMealQuery["sources"]>[number];

const sourceLabels: Record<PokerMeal["source"], string> = {
  home: "Home",
  restaurant: "Restaurant",
  delivery: "Delivery",
};

export const VoteEditor = ({ sessionId, participant }: VoteEditorProps) => {
  const colors = useColors();
  const submission = useSubmitPokerVotesMutation(sessionId);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<MealSource | "all">("all");
  const [page, setPage] = useState(1);
  const [selectedMeals, setSelectedMeals] = useState<PokerMeal[]>([]);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const mealsQuery = usePokerMealsQuery(sessionId, {
    search: debouncedSearch || undefined,
    sources: source === "all" ? undefined : [source],
    page,
  });
  const meals = mealsQuery.data?.results ?? [];

  useEffect(() => {
    setSelectedMeals(
      [...(participant.votes ?? [])]
        .sort((first, second) => first.priority - second.priority)
        .map(vote => vote.meal)
    );
  }, [participant.id, participant.updated_at, participant.votes]);

  const clearSubmissionStatus = () => {
    if (submission.isError || submission.isSuccess) submission.reset();
  };

  const toggleMeal = (meal: PokerMeal) => {
    clearSubmissionStatus();
    setSelectedMeals(current => {
      const isSelected = current.some(item => item.id === meal.id);
      if (isSelected) return current.filter(item => item.id !== meal.id);
      return current.length < 3 ? [...current, meal] : current;
    });
  };

  const moveMeal = (index: number, direction: -1 | 1) => {
    clearSubmissionStatus();
    setSelectedMeals(current => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <section
      aria-labelledby="poker-vote-heading"
      css={{
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <div
        css={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 id="poker-vote-heading" css={{ margin: 0, fontSize: 20 }}>
            Your cards
          </h2>
          <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
            Choose up to three meals. Their order determines 4, 3 and 1 points.
          </p>
        </div>
        <span
          css={{
            padding: "4px 9px",
            borderRadius: 999,
            background: participant.is_ready ? colors.successBg : colors.surfaceAlt,
            color: participant.is_ready ? colors.success : colors.textSecondary,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {participant.is_ready ? "Submitted" : "Not submitted"}
        </span>
      </div>

      <RankedSelection
        meals={selectedMeals}
        disabled={submission.isPending}
        onMove={moveMeal}
        onRemove={toggleMeal}
      />

      <HorizontalScroller ariaLabel="Poker meal filters" marginBottom={14}>
        <label css={{ flex: "1 1 240px", minWidth: 200 }}>
          <span css={visuallyHiddenStyles}>Search group meals</span>
          <input
            type="search"
            value={search}
            placeholder="Search group meals"
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            css={getFilterControlStyles(colors, { width: "100%" })}
          />
        </label>
        <Select
          label="Source"
          value={source}
          size="sm"
          hideLabel
          fullWidth={false}
          options={[
            { value: "all", label: "All sources" },
            { value: "home", label: "Home" },
            { value: "restaurant", label: "Restaurant" },
            { value: "delivery", label: "Delivery" },
          ]}
          onChange={value => {
            setSource(value as MealSource | "all");
            setPage(1);
          }}
        />
      </HorizontalScroller>

      {mealsQuery.isPending ? <MealsLoading /> : null}
      {mealsQuery.isError ? (
        <div role="alert" css={{ color: colors.danger, fontSize: 14 }}>
          Unable to load group meals. Please try again.
        </div>
      ) : null}
      {mealsQuery.isSuccess && meals.length === 0 ? (
        <p css={{ color: colors.textSecondary, fontSize: 14 }}>
          No shared meals match these filters.
        </p>
      ) : null}
      {mealsQuery.isSuccess && meals.length > 0 ? (
        <MealChoices
          meals={meals}
          selectedMeals={selectedMeals}
          disabled={submission.isPending}
          onToggle={toggleMeal}
        />
      ) : null}

      {mealsQuery.data &&
      (Boolean(mealsQuery.data.previous) || Boolean(mealsQuery.data.next)) ? (
        <div
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!mealsQuery.data.previous}
            onClick={() => setPage(current => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <span css={{ color: colors.textSecondary, fontSize: 13 }}>Page {page}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!mealsQuery.data.next}
            onClick={() => setPage(current => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <div
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 18,
        }}
      >
        {submission.isSuccess ? (
          <span role="status" css={{ color: colors.success, fontSize: 14 }}>
            Choices saved.
          </span>
        ) : null}
        {submission.submitError ? (
          <span role="alert" css={{ color: colors.danger, fontSize: 14 }}>
            {submission.submitError}
          </span>
        ) : null}
        <Button
          size="sm"
          loading={submission.isPending}
          disabled={selectedMeals.length === 0}
          onClick={() =>
            submission.mutate({ meal_ids: selectedMeals.map(meal => meal.id) })
          }
        >
          {participant.is_ready ? "Update choices" : "Submit choices"}
        </Button>
      </div>
    </section>
  );
};

const MealChoices = ({
  meals,
  selectedMeals,
  disabled,
  onToggle,
}: {
  meals: PokerMeal[];
  selectedMeals: PokerMeal[];
  disabled: boolean;
  onToggle: (meal: PokerMeal) => void;
}) => {
  const colors = useColors();

  return (
    <ul
      aria-label="Available group meals"
      css={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 10,
        margin: 0,
        padding: 0,
        listStyle: "none",
      }}
    >
      {meals.map(meal => {
        const selectedIndex = selectedMeals.findIndex(item => item.id === meal.id);
        const isSelected = selectedIndex >= 0;
        const selectionDisabled = !isSelected && selectedMeals.length >= 3;

        return (
          <li key={meal.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              disabled={disabled || selectionDisabled}
              onClick={() => onToggle(meal)}
              css={{
                width: "100%",
                minHeight: 74,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "12px 14px",
                border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                borderRadius: 12,
                background: isSelected ? colors.infoBg : colors.background,
                color: colors.textPrimary,
                font: "inherit",
                textAlign: "left",
                cursor: selectionDisabled ? "not-allowed" : "pointer",
                opacity: selectionDisabled ? 0.55 : 1,
                "&:hover:not(:disabled)": { borderColor: colors.primary },
                "&:focus-visible": {
                  outline: `3px solid ${colors.focus}`,
                  outlineOffset: 2,
                },
              }}
            >
              <span css={{ minWidth: 0 }}>
                <strong css={{ display: "block", overflowWrap: "anywhere" }}>
                  {meal.name}
                </strong>
                <span
                  css={{
                    display: "block",
                    marginTop: 4,
                    color: colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {sourceLabels[meal.source]}
                </span>
              </span>
              {isSelected ? (
                <span
                  aria-label={`Priority ${selectedIndex + 1}`}
                  css={{
                    flex: "0 0 auto",
                    width: 28,
                    height: 28,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: colors.primary,
                    color: colors.onPrimary,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {selectedIndex + 1}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const RankedSelection = ({
  meals,
  disabled,
  onMove,
  onRemove,
}: {
  meals: PokerMeal[];
  disabled: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (meal: PokerMeal) => void;
}) => {
  const colors = useColors();

  if (meals.length === 0) {
    return (
      <div
        css={{
          marginBottom: 16,
          padding: "14px 16px",
          border: `1px dashed ${colors.border}`,
          borderRadius: 12,
          color: colors.textSecondary,
          fontSize: 14,
        }}
      >
        Select at least one meal from the group library.
      </div>
    );
  }

  return (
    <ol
      aria-label="Ranked meal choices"
      css={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        margin: "0 0 16px",
        padding: 0,
        listStyle: "none",
      }}
    >
      {meals.map((meal, index) => (
        <li
          key={meal.id}
          css={{
            minHeight: 44,
            display: "grid",
            gridTemplateColumns: "30px minmax(0, 1fr) auto",
            alignItems: "center",
            gap: 8,
            padding: "5px 6px 5px 10px",
            borderRadius: 10,
            background: colors.surfaceAlt,
          }}
        >
          <strong css={{ color: colors.primary }}>{index + 1}</strong>
          <span css={{ minWidth: 0, overflowWrap: "anywhere" }}>{meal.name}</span>
          <span css={{ display: "flex", gap: 2 }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowIcon direction="up" />}
              ariaLabel={`Move ${meal.name} up`}
              disabled={disabled || index === 0}
              onClick={() => onMove(index, -1)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowIcon direction="down" />}
              ariaLabel={`Move ${meal.name} down`}
              disabled={disabled || index === meals.length - 1}
              onClick={() => onMove(index, 1)}
            />
            <Button
              variant="ghost"
              size="sm"
              icon={<RemoveIcon />}
              ariaLabel={`Remove ${meal.name}`}
              disabled={disabled}
              onClick={() => onRemove(meal)}
            />
          </span>
        </li>
      ))}
    </ol>
  );
};

const MealsLoading = () => {
  const colors = useColors();
  return (
    <div role="status" aria-label="Loading group meals">
      <div css={{ height: 158, borderRadius: 12, background: colors.surfaceAlt }} />
    </div>
  );
};

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => setDebouncedValue(value), delay);
    return () => globalThis.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};

const getFilterControlStyles = (
  colors: ReturnType<typeof useColors>,
  extra: Record<string, string> = {}
) => ({
  ...extra,
  height: 36,
  boxSizing: "border-box" as const,
  padding: "0 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  font: "inherit",
  fontSize: 13,
  "&:focus-visible": {
    outline: "none",
    borderColor: colors.focus,
    boxShadow: `inset 0 0 0 1px ${colors.focus}`,
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

const ArrowIcon = ({ direction }: { direction: "up" | "down" }) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    css={{ transform: direction === "down" ? "rotate(180deg)" : "none" }}
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const RemoveIcon = () => (
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
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
