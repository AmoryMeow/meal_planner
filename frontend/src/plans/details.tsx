import { Link, Navigate, useParams } from "react-router-dom";

import { GroupMembers, useGroupQuery } from "@package/groups";
import { usePlanQuery } from "@package/plan";
import { Button, getContentContainerStyles, useColors, useIsMobile } from "@package/ui";

import { PlanSettingsForm } from "./plan-settings-form";
import { PlanSettingsSummary } from "./plan-settings-summary";

export const PlanDetails = () => {
  const { planId: planIdParam } = useParams();
  const planId = Number(planIdParam);
  const hasValidPlanId = Number.isSafeInteger(planId) && planId > 0;
  const planQuery = usePlanQuery(hasValidPlanId ? planId : 0);
  const groupId = planQuery.data?.group_id ?? 0;
  const groupQuery = useGroupQuery(groupId);
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
      {planQuery.isSuccess && planQuery.data.can_manage ? (
        <PlanSettingsForm plan={planQuery.data} />
      ) : null}
      {planQuery.isSuccess && !planQuery.data.can_manage ? (
        <PlanSettingsSummary plan={planQuery.data} />
      ) : null}
      {planQuery.isSuccess && planQuery.data.scope === "group" ? (
        <GroupMembersSection color={planQuery.data.color} groupQuery={groupQuery} />
      ) : null}
    </main>
  );
};

const GroupMembersSection = ({
  color,
  groupQuery,
}: {
  color: string;
  groupQuery: ReturnType<typeof useGroupQuery>;
}) => {
  if (groupQuery.isPending) {
    return <GroupMembersStatus />;
  }
  if (groupQuery.isError) {
    return <GroupMembersError onRetry={() => void groupQuery.refetch()} />;
  }
  return <GroupMembers color={color} group={groupQuery.data} />;
};

const GroupMembersStatus = () => {
  const colors = useColors();

  return (
    <p
      role="status"
      css={{
        margin: "24px 0 0",
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.surface,
        color: colors.textSecondary,
      }}
    >
      Loading members…
    </p>
  );
};

const GroupMembersError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();

  return (
    <section
      role="alert"
      css={{
        marginTop: 24,
        padding: 20,
        border: `1px solid ${colors.danger}`,
        borderRadius: 14,
        background: colors.surface,
        color: colors.danger,
      }}
    >
      <p css={{ margin: "0 0 12px" }}>Unable to load group members.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
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
