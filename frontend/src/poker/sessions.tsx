import { useRef } from "react";

import {
  Button,
  getContentContainerStyles,
  hexToRgba,
  PlusIcon,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type PokerSession, type PokerSessionStatus } from "./api";
import { CreatePokerSessionDialog } from "./create-session-dialog";
import { usePokerSessionsQuery } from "./queries";

const ACTIVE_STATUSES: PokerSessionStatus[] = ["waiting", "voting", "revealed"];

const mealTypeLabels: Record<PokerSession["meal_type"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const statusLabels: Record<PokerSessionStatus, string> = {
  waiting: "Waiting",
  voting: "Voting",
  revealed: "Revealed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const PokerSessions = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const sessionsQuery = usePokerSessionsQuery();
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const sessions = sessionsQuery.data ?? [];
  const activeSessions = sessions.filter(session =>
    ACTIVE_STATUSES.includes(session.status)
  );
  const sessionHistory = sessions.filter(
    session => !ACTIVE_STATUSES.includes(session.status)
  );

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
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            css={{
              margin: 0,
              color: colors.textPrimary,
              fontSize: 24,
              lineHeight: 1.25,
            }}
          >
            Meal Poker
          </h1>
          <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
            Pick a meal together without revealing anyone&apos;s cards early.
          </p>
        </div>
        <Button
          size="sm"
          icon={<PlusIcon />}
          onClick={() => createDialogRef.current?.showModal()}
        >
          Create session
        </Button>
      </header>

      <CreatePokerSessionDialog dialogRef={createDialogRef} />

      {sessionsQuery.isPending ? <SessionsLoading /> : null}
      {sessionsQuery.isError ? (
        <SessionsError onRetry={() => void sessionsQuery.refetch()} />
      ) : null}
      {sessionsQuery.isSuccess && sessions.length === 0 ? <SessionsEmpty /> : null}
      {sessionsQuery.isSuccess && activeSessions.length > 0 ? (
        <SessionSection title="Active sessions" sessions={activeSessions} />
      ) : null}
      {sessionsQuery.isSuccess && sessionHistory.length > 0 ? (
        <SessionSection title="History" sessions={sessionHistory} />
      ) : null}
    </main>
  );
};

const SessionSection = ({
  title,
  sessions,
}: {
  title: string;
  sessions: PokerSession[];
}) => {
  const colors = useColors();

  return (
    <section css={{ marginBottom: 28 }}>
      <h2
        css={{
          margin: "0 0 10px",
          color: colors.textSecondary,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h2>
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
        {sessions.map(session => (
          <li key={session.id}>
            <SessionRow session={session} />
          </li>
        ))}
      </ul>
    </section>
  );
};

const SessionRow = ({ session }: { session: PokerSession }) => {
  const colors = useColors();
  const statusColors = getStatusColors(session.status, colors);

  return (
    <article
      css={{
        minHeight: 84,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 16,
        padding: "14px 18px",
        border: `1px solid ${colors.border}`,
        borderLeft: `5px solid ${session.group_color}`,
        borderRadius: 14,
        background: `linear-gradient(90deg, ${hexToRgba(session.group_color, 0.08)}, ${colors.surface} 38%)`,
      }}
    >
      <div css={{ minWidth: 0 }}>
        <div css={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <h3
            css={{
              minWidth: 0,
              margin: 0,
              color: colors.textPrimary,
              fontSize: 17,
              overflowWrap: "anywhere",
            }}
          >
            {session.group_name} · {mealTypeLabels[session.meal_type]}
          </h3>
          <span
            css={{
              padding: "3px 8px",
              borderRadius: 999,
              background: statusColors.background,
              color: statusColors.text,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {statusLabels[session.status]}
          </span>
        </div>
        <div
          css={{
            display: "flex",
            flexWrap: "wrap",
            gap: "3px 14px",
            marginTop: 7,
            color: colors.textSecondary,
            fontSize: 13,
          }}
        >
          <span>{formatSessionDate(session.date)}</span>
          <span>
            {session.participant_count} participant
            {session.participant_count === 1 ? "" : "s"}
          </span>
          <span>by {session.organizer_email}</span>
        </div>
      </div>
      <span
        aria-label={session.has_joined ? "Joined" : "Not joined"}
        css={{
          color: session.has_joined ? colors.success : colors.textMuted,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {session.has_joined ? "Joined" : "Not joined"}
      </span>
    </article>
  );
};

const SessionsLoading = () => {
  const colors = useColors();

  return (
    <div role="status" aria-label="Loading Meal Poker sessions">
      {[0, 1, 2].map(item => (
        <div
          key={item}
          aria-hidden="true"
          css={{
            height: 84,
            marginBottom: 10,
            borderRadius: 14,
            background: colors.surfaceAlt,
            animation: "poker-pulse 1.2s ease-in-out infinite alternate",
            "@keyframes poker-pulse": {
              from: { opacity: 0.55 },
              to: { opacity: 1 },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        />
      ))}
    </div>
  );
};

const SessionsError = ({ onRetry }: { onRetry: () => void }) => {
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
      <h2 css={{ margin: 0, fontSize: 18 }}>Unable to load Meal Poker</h2>
      <p css={{ margin: "8px 0 16px" }}>Please try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </section>
  );
};

const SessionsEmpty = () => {
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
      <div aria-hidden="true" css={{ marginBottom: 10, fontSize: 30 }}>
        🃏
      </div>
      <h2 css={{ margin: 0, color: colors.textPrimary, fontSize: 20 }}>
        No Meal Poker sessions yet
      </h2>
      <p css={{ margin: "8px 0 0", color: colors.textSecondary }}>
        Create a session and invite your group to choose the next meal.
      </p>
    </section>
  );
};

const formatSessionDate = (value: string) =>
  dateFormatter.format(new Date(`${value}T00:00:00`));

const getStatusColors = (
  status: PokerSessionStatus,
  colors: ReturnType<typeof useColors>
) => {
  if (status === "completed") {
    return { text: colors.success, background: colors.successBg };
  }
  if (status === "voting") {
    return { text: colors.warning, background: colors.warningBg };
  }
  if (status === "revealed") {
    return { text: colors.accent, background: colors.accentBg };
  }
  if (status === "cancelled") {
    return { text: colors.textSecondary, background: colors.surfaceAlt };
  }
  return { text: colors.info, background: colors.infoBg };
};
