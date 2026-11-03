import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  Button,
  getContentContainerStyles,
  PlusIcon,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type Meal, type MealFilters, type MealSource } from "./api";
import { MealFiltersBar } from "./meal-filters";
import { useMealsQuery } from "./queries";

const sourceLabels: Record<MealSource, string> = {
  home: "Home",
  restaurant: "Restaurant",
  delivery: "Delivery",
};

export const Meals = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = getFilters(searchParams);
  const mealsQuery = useMealsQuery(filters);
  const hasActiveFilters = searchParams.size > 0;

  const setFilters = (nextFilters: MealFilters) => {
    setSearchParams(getSearchParams(nextFilters), { replace: true });
  };

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
        <div>
          <h1 css={{ margin: 0, color: colors.textPrimary, fontSize: 24 }}>Meals</h1>
          <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
            Your recipes and meals shared with you.
          </p>
        </div>
        <Button size="sm" icon={<PlusIcon />} onClick={() => navigate("/meals/new")}>
          Add meal
        </Button>
      </header>

      <MealFiltersBar filters={filters} onChange={setFilters} />

      {mealsQuery.isPending ? <MealsLoading /> : null}
      {mealsQuery.isError ? (
        <MealsError onRetry={() => void mealsQuery.refetch()} />
      ) : null}
      {mealsQuery.isSuccess && mealsQuery.data.results.length === 0 ? (
        <MealsEmpty filtered={hasActiveFilters} />
      ) : null}
      {mealsQuery.isSuccess && mealsQuery.data.results.length > 0 ? (
        <>
          <section aria-label="Meal library">
            <ul
              css={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
                gap: 12,
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
            >
              {mealsQuery.data.results.map(meal => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </ul>
          </section>
          <MealsPagination
            count={mealsQuery.data.count}
            page={filters.page ?? 1}
            hasPrevious={Boolean(mealsQuery.data.previous)}
            hasNext={Boolean(mealsQuery.data.next)}
            onPageChange={page => setFilters({ ...filters, page })}
          />
        </>
      ) : null}
    </main>
  );
};

const MealCard = ({ meal }: { meal: Meal }) => {
  const colors = useColors();

  return (
    <li css={{ height: "100%" }}>
      <Link
        to={`/meals/${meal.id}`}
        aria-label={`${meal.can_edit ? "Edit" : "View"} ${meal.name}`}
        css={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          height: 136,
          boxSizing: "border-box",
          padding: 14,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          background: colors.surface,
          color: "inherit",
          textDecoration: "none",
          transition: "border-color 0.15s ease, transform 0.15s ease",
          "&:hover": {
            borderColor: colors.primary,
            transform: "translateY(-1px)",
          },
          "&:focus-visible": {
            outline: `3px solid ${colors.focus}`,
            outlineOffset: 2,
          },
        }}
      >
        <div
          css={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <h2
            css={{
              margin: 0,
              overflow: "hidden",
              color: colors.textPrimary,
              fontSize: 17,
              lineHeight: 1.35,
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {meal.name}
          </h2>
          <span
            css={{
              flex: "0 0 auto",
              padding: "3px 7px",
              borderRadius: 999,
              background: colors.chip,
              color: colors.textSecondary,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {sourceLabels[meal.source]}
          </span>
        </div>

        {meal.tags.length ? (
          <div
            aria-label={`Tags: ${meal.tags.map(tag => tag.name).join(", ")}`}
            css={{
              display: "flex",
              minWidth: 0,
              minHeight: 21,
              overflow: "hidden",
              flexWrap: "nowrap",
              gap: 5,
            }}
          >
            {meal.tags.slice(0, 3).map(tag => (
              <span
                key={tag.id}
                css={{
                  maxWidth: 120,
                  overflow: "hidden",
                  padding: "3px 7px",
                  borderRadius: 999,
                  background: colors.chip,
                  color: colors.textSecondary,
                  fontSize: 11,
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tag.name}
              </span>
            ))}
            {meal.tags.length > 3 ? (
              <span css={{ color: colors.textMuted, fontSize: 12 }}>
                +{meal.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <span
          css={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginTop: "auto",
            paddingTop: 2,
            color: colors.textSecondary,
            fontSize: 12,
          }}
        >
          <span>
            {meal.ingredients.length === 1
              ? "1 ingredient"
              : `${meal.ingredients.length} ingredients`}
          </span>
          <span
            css={{
              color: meal.is_owner ? colors.textSecondary : colors.info,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {meal.is_owner ? "My meal" : meal.can_edit ? "Can edit" : "View only"}
          </span>
        </span>
      </Link>
    </li>
  );
};

const MealsPagination = ({
  count,
  page,
  hasPrevious,
  hasNext,
  onPageChange,
}: {
  count: number;
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}) => {
  const colors = useColors();
  if (!hasPrevious && !hasNext) return null;

  return (
    <nav
      aria-label="Meal pages"
      css={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 14,
      }}
    >
      <span css={{ color: colors.textSecondary, fontSize: 13 }}>
        Page {page} · {count} meals
      </span>
      <div css={{ display: "flex", gap: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
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
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
        gap: 12,
      }}
    >
      {[0, 1, 2, 3].map(item => (
        <div
          key={item}
          aria-hidden="true"
          css={{ height: 136, borderRadius: 12, background: colors.surfaceAlt }}
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
        borderRadius: 12,
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

const MealsEmpty = ({ filtered }: { filtered: boolean }) => {
  const colors = useColors();
  return (
    <section
      css={{
        padding: "40px 24px",
        border: `1px dashed ${colors.border}`,
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <h2 css={{ margin: 0, color: colors.textPrimary, fontSize: 18 }}>
        {filtered ? "No meals match these filters" : "No meals yet"}
      </h2>
      <p css={{ margin: "8px 0 0", color: colors.textSecondary, fontSize: 14 }}>
        {filtered
          ? "Change or clear the filters to see more meals."
          : "Create your first meal to start the library."}
      </p>
    </section>
  );
};

const getFilters = (params: URLSearchParams): MealFilters => {
  const source = params.get("source");
  const access = params.get("access");
  const ordering = params.get("ordering");
  const page = Number(params.get("page"));

  return {
    search: params.get("search") || undefined,
    sources:
      source === "home" || source === "restaurant" || source === "delivery"
        ? [source]
        : undefined,
    tags: params.getAll("tag").filter(Boolean),
    access: access === "owned" || access === "shared" ? access : "all",
    ordering: ordering === "name" ? "name" : "recent",
    page: Number.isSafeInteger(page) && page > 1 ? page : undefined,
  };
};

const getSearchParams = (filters: MealFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  filters.sources?.forEach(source => params.append("source", source));
  filters.tags?.forEach(tag => params.append("tag", tag));
  if (filters.access && filters.access !== "all") params.set("access", filters.access);
  if (filters.ordering && filters.ordering !== "recent") {
    params.set("ordering", filters.ordering);
  }
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
};
