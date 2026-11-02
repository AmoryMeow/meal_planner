import { Link, Navigate, useParams } from "react-router-dom";

import { type MealType, usePlanQuery } from "@package/plan";
import {
  Button,
  getContentContainerStyles,
  hexToRgba,
  useColors,
  useIsMobile,
} from "@package/ui";

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const PlanDetails = () => {
  const { planId: planIdParam } = useParams();
  const planId = Number(planIdParam);
  const hasValidPlanId = Number.isSafeInteger(planId) && planId > 0;
  const planQuery = usePlanQuery(hasValidPlanId ? planId : 0);
  const colors = useColors();
  const isMobile = useIsMobile();

  if (!hasValidPlanId) return <Navigate to="/plans" replace />;

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
      <nav aria-label="Breadcrumb" css={{ marginBottom: 16 }}>
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
              to="/plans"
              css={{
                color: colors.link,
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.25,
                textDecoration: "none",
                "&:hover": {
                  color: colors.linkHover,
                  textDecoration: "underline",
                },
                "&:focus-visible": {
                  outline: `2px solid ${colors.focus}`,
                  outlineOffset: 3,
                  borderRadius: 4,
                },
              }}
            >
              Plans
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
                lineHeight: 1.25,
              }}
            >
              {planQuery.data?.name ?? "Plan"}
            </h1>
          </li>
        </ol>
      </nav>

      {planQuery.isPending ? (
        <PlanDetailsStatus>Loading plan…</PlanDetailsStatus>
      ) : null}
      {planQuery.isError ? (
        <PlanDetailsError onRetry={() => void planQuery.refetch()} />
      ) : null}
      {planQuery.isSuccess ? (
        <section
          aria-label="Plan details"
          css={{
            padding: 20,
            border: `1px solid ${colors.border}`,
            borderLeft: `5px solid ${planQuery.data.color}`,
            borderRadius: 14,
            background: `linear-gradient(90deg, ${hexToRgba(planQuery.data.color, 0.08)}, ${colors.surface} 45%)`,
          }}
        >
          <h2 css={{ margin: "0 0 12px", fontSize: 16 }}>Meal sections</h2>
          <ul
            css={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {planQuery.data.enabled_meal_types.map(mealType => (
              <li
                key={mealType}
                css={{
                  padding: "5px 9px",
                  borderRadius: 999,
                  background: colors.chip,
                  color: colors.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {mealTypeLabels[mealType]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
};

const PlanDetailsStatus = ({ children }: { children: string }) => {
  const colors = useColors();

  return (
    <p
      role="status"
      css={{
        margin: 0,
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.surface,
        color: colors.textSecondary,
      }}
    >
      {children}
    </p>
  );
};

const PlanDetailsError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();

  return (
    <section
      role="alert"
      css={{
        padding: 20,
        border: `1px solid ${colors.danger}`,
        borderRadius: 14,
        background: colors.surface,
        color: colors.danger,
      }}
    >
      <p css={{ margin: "0 0 12px" }}>Unable to load this plan.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
  );
};
