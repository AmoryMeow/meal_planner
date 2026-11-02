import { Link } from "react-router-dom";

import { type MealPlan, type MealType, usePlansQuery } from "@package/plan";
import {
  Button,
  getContentContainerStyles,
  hexToRgba,
  useColors,
  useIsMobile,
} from "@package/ui";

export { PlanDetails } from "./details";

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const Plans = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const plansQuery = usePlansQuery();

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
        <div
          css={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "4px 12px",
          }}
        >
          <h1
            css={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: 24,
              lineHeight: 1.25,
            }}
          >
            Plans
          </h1>
          <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
            Your personal and shared meal plans.
          </p>
        </div>
      </header>

      {plansQuery.isPending ? <PlansLoading isMobile={isMobile} /> : null}
      {plansQuery.isError ? (
        <PlansError onRetry={() => void plansQuery.refetch()} />
      ) : null}
      {plansQuery.isSuccess && plansQuery.data.length === 0 ? <PlansEmpty /> : null}
      {plansQuery.isSuccess && plansQuery.data.length > 0 ? (
        <section aria-label="Available meal plans">
          <ul
            css={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {plansQuery.data.map(plan => (
              <li key={plan.id}>
                <PlanRow plan={plan} isMobile={isMobile} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
};

const PlanRow = ({ plan, isMobile }: { plan: MealPlan; isMobile: boolean }) => {
  const colors = useColors();

  return (
    <Link
      to={`/plans/${plan.id}`}
      aria-label={`Open ${plan.name}`}
      css={{
        minHeight: 88,
        boxSizing: "border-box",
        padding: "16px 20px",
        border: `1px solid ${colors.border}`,
        borderLeft: `5px solid ${plan.color}`,
        borderRadius: 14,
        background: `linear-gradient(90deg, ${hexToRgba(plan.color, 0.08)}, ${colors.surface} 45%)`,
        display: "grid",
        gridTemplateColumns: isMobile
          ? "minmax(0, 1fr)"
          : "minmax(195px, 1fr) minmax(300px, 1fr)",
        alignItems: "center",
        gap: isMobile ? 14 : 24,
        color: "inherit",
        textDecoration: "none",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        "&:hover": {
          borderColor: plan.color,
          transform: "translateY(-1px)",
        },
        "&:focus": { outline: "none" },
        "&:focus-visible": {
          outline: `3px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <div css={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          css={{
            width: 12,
            height: 12,
            flex: "0 0 auto",
            borderRadius: "50%",
            background: plan.color,
            boxShadow: `0 0 0 3px ${hexToRgba(plan.color, 0.18)}`,
          }}
        />
        <h2
          css={{
            minWidth: 0,
            margin: 0,
            color: colors.textPrimary,
            fontSize: 18,
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {plan.name}
        </h2>
      </div>

      <div>
        {isMobile ? (
          <h3
            css={{
              margin: "0 0 7px",
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Meal sections
          </h3>
        ) : null}
        <ul
          aria-label="Meal sections"
          css={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            gap: 6,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {plan.enabled_meal_types.map(mealType => (
            <li
              key={mealType}
              css={{
                padding: "4px 8px",
                borderRadius: 999,
                background: colors.chip,
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {mealTypeLabels[mealType]}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
};

const PlansLoading = ({ isMobile }: { isMobile: boolean }) => {
  const colors = useColors();

  return (
    <div
      role="status"
      aria-label="Loading plans"
      css={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {[0, 1].map(item => (
        <div
          key={item}
          aria-hidden="true"
          css={{
            height: isMobile ? 126 : 88,
            borderRadius: 14,
            background: colors.surfaceAlt,
            animation: "plans-pulse 1.2s ease-in-out infinite alternate",
            "@keyframes plans-pulse": {
              from: { opacity: 0.55 },
              to: { opacity: 1 },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />
      ))}
    </div>
  );
};

const PlansError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();

  return (
    <section
      role="alert"
      css={{
        padding: 24,
        border: `1px solid ${colors.danger}`,
        borderRadius: 16,
        background: colors.surface,
        color: colors.danger,
      }}
    >
      <h2 css={{ margin: 0, fontSize: 18 }}>Unable to load plans</h2>
      <p css={{ margin: "8px 0 16px" }}>Please try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
  );
};

const PlansEmpty = () => {
  const colors = useColors();

  return (
    <section
      css={{
        padding: "48px 24px",
        border: `1px dashed ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        textAlign: "center",
      }}
    >
      <h2 css={{ margin: 0, color: colors.textPrimary, fontSize: 20 }}>
        No plans available
      </h2>
      <p css={{ margin: "8px 0 0", color: colors.textSecondary }}>
        Your meal plans will appear here.
      </p>
    </section>
  );
};
