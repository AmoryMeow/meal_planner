import { Link, useParams } from "react-router-dom";

import { useAuthSession } from "@package/auth";
import {
  Button,
  getContentContainerStyles,
  hexToRgba,
  useColors,
  useIsMobile,
} from "@package/ui";

import { type PokerSession, type PokerSessionStatus } from "./api";
import { CancelSessionButton } from "./cancel-session-dialog";
import {
  useJoinPokerSessionMutation,
  usePokerSessionQuery,
  useStartPokerSessionMutation,
} from "./queries";
import { PokerResults, VotingControls } from "./results";
import { VoteEditor } from "./vote-editor";

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
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const PokerSessionDetails = () => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const { user } = useAuthSession();
  const { sessionId: sessionIdParam } = useParams();
  const sessionId = Number(sessionIdParam);
  const sessionQuery = usePokerSessionQuery(sessionId);
  const joining = useJoinPokerSessionMutation(sessionId);
  const starting = useStartPokerSessionMutation(sessionId);
  const session = sessionQuery.data;
  const currentParticipant = session?.participants.find(
    participant => participant.user_id === user?.id
  );
  const actionError = joining.submitError || starting.submitError;

  return (
    <main
      css={{
        ...getContentContainerStyles(isMobile),
        paddingTop: isMobile ? 16 : 26,
        paddingBottom: isMobile
          ? "calc(24px + var(--nav-h) + var(--safe-bottom))"
          : "48px",
      }}
    >
      <nav aria-label="Breadcrumb" css={{ marginBottom: 16 }}>
        <ol
          css={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: 0,
            padding: 0,
            listStyle: "none",
            color: colors.textSecondary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <li>
            <Link
              to="/poker"
              css={{
                color: colors.link,
                textDecoration: "none",
                "&:hover": { color: colors.linkHover },
                "&:focus-visible": {
                  outline: `2px solid ${colors.focus}`,
                  outlineOffset: 2,
                },
              }}
            >
              Meal Poker
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{session?.group_name ?? "Session"}</li>
        </ol>
      </nav>

      {sessionQuery.isPending ? <DetailsLoading /> : null}
      {sessionQuery.isError || !Number.isInteger(sessionId) || sessionId <= 0 ? (
        <DetailsError onRetry={() => void sessionQuery.refetch()} />
      ) : null}
      {session ? (
        <>
          <SessionHeader session={session} />

          <div
            css={{
              display: "grid",
              gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) 280px",
              alignItems: "start",
              gap: 16,
            }}
          >
            <div css={{ minWidth: 0 }}>
              {session.status === "waiting" ? (
                <WaitingPanel
                  session={session}
                  joining={joining}
                  starting={starting}
                  actionError={actionError}
                />
              ) : null}
              {session.status === "voting" && currentParticipant ? (
                <>
                  <VoteEditor sessionId={session.id} participant={currentParticipant} />
                  <VotingControls session={session} />
                </>
              ) : null}
              {session.status === "voting" && !currentParticipant ? (
                <StateMessage
                  title="Voting is already in progress"
                  description="Only participants who joined before voting started can submit cards."
                />
              ) : null}
              {session.status === "revealed" || session.status === "completed" ? (
                <PokerResults session={session} />
              ) : null}
              {session.status === "cancelled" ? (
                <StateMessage
                  title="This session was cancelled"
                  description="No further actions are available."
                />
              ) : null}
            </div>

            <ParticipantsPanel session={session} />
          </div>
        </>
      ) : null}
    </main>
  );
};

type SessionMutation = ReturnType<typeof useJoinPokerSessionMutation>;

const WaitingPanel = ({
  session,
  joining,
  starting,
  actionError,
}: {
  session: PokerSession;
  joining: SessionMutation;
  starting: SessionMutation;
  actionError: string;
}) => {
  const colors = useColors();
  const actionPending = joining.isPending || starting.isPending;

  return (
    <section
      css={{
        padding: 24,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <h2 css={{ margin: 0, fontSize: 20 }}>Waiting for players</h2>
      <p css={{ margin: "8px 0 18px", color: colors.textSecondary }}>
        Participants can join before the organizer starts voting.
      </p>

      {!session.has_joined ? (
        <Button size="sm" loading={joining.isPending} onClick={() => joining.mutate()}>
          Join session
        </Button>
      ) : null}

      {session.has_joined && session.can_manage ? (
        <div css={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Button
            size="sm"
            loading={starting.isPending}
            disabled={session.participant_count < 2 || actionPending}
            onClick={() => starting.mutate()}
          >
            Start voting
          </Button>
          <CancelSessionButton sessionId={session.id} disabled={actionPending} />
          {session.participant_count < 2 ? (
            <span css={{ color: colors.textSecondary, fontSize: 13 }}>
              At least two participants are required.
            </span>
          ) : null}
        </div>
      ) : null}

      {session.has_joined && !session.can_manage ? (
        <p role="status" css={{ margin: 0, color: colors.textSecondary }}>
          You joined. Waiting for the organizer to start voting.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" css={{ margin: "14px 0 0", color: colors.danger }}>
          {actionError}
        </p>
      ) : null}
    </section>
  );
};

const SessionHeader = ({ session }: { session: PokerSession }) => {
  const colors = useColors();
  const statusColors = getStatusColors(session.status, colors);

  return (
    <header
      css={{
        marginBottom: 16,
        padding: "18px 20px",
        border: `1px solid ${colors.border}`,
        borderLeft: `5px solid ${session.group_color}`,
        borderRadius: 16,
        background: `linear-gradient(90deg, ${hexToRgba(session.group_color, 0.1)}, ${colors.surface} 45%)`,
      }}
    >
      <div css={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9 }}>
        <h1 css={{ margin: 0, color: colors.textPrimary, fontSize: 24 }}>
          {session.group_name} · {mealTypeLabels[session.meal_type]}
        </h1>
        <span
          css={{
            padding: "4px 9px",
            borderRadius: 999,
            background: statusColors.background,
            color: statusColors.text,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {statusLabels[session.status]}
        </span>
      </div>
      <p css={{ margin: "7px 0 0", color: colors.textSecondary, fontSize: 14 }}>
        {formatSessionDate(session.date)} · organized by {session.organizer_email}
      </p>
    </header>
  );
};

const ParticipantsPanel = ({ session }: { session: PokerSession }) => {
  const colors = useColors();
  const readyCount = session.participants.filter(
    participant => participant.is_ready
  ).length;

  return (
    <aside
      aria-labelledby="poker-participants-heading"
      css={{
        padding: 18,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <div
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2 id="poker-participants-heading" css={{ margin: 0, fontSize: 17 }}>
          Participants
        </h2>
        {session.status === "voting" ? (
          <span css={{ color: colors.textSecondary, fontSize: 12 }}>
            {readyCount}/{session.participant_count} ready
          </span>
        ) : null}
      </div>
      <ul css={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" }}>
        {session.participants.map(participant => {
          const displayName =
            [participant.first_name, participant.last_name].filter(Boolean).join(" ") ||
            participant.email;
          return (
            <li
              key={participant.id}
              css={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: 10,
                background: colors.surfaceAlt,
              }}
            >
              <span css={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </span>
              {session.status === "voting" ? (
                <span
                  aria-label={participant.is_ready ? "Ready" : "Not ready"}
                  css={{
                    flex: "0 0 auto",
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: participant.is_ready
                      ? colors.success
                      : colors.textMuted,
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

const StateMessage = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  const colors = useColors();
  return (
    <section
      css={{
        padding: 24,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <h2 css={{ margin: 0, fontSize: 20 }}>{title}</h2>
      <p css={{ margin: "8px 0 0", color: colors.textSecondary }}>{description}</p>
    </section>
  );
};

const DetailsLoading = () => {
  const colors = useColors();
  return (
    <div role="status" aria-label="Loading Meal Poker session">
      <div css={{ height: 118, borderRadius: 16, background: colors.surfaceAlt }} />
    </div>
  );
};

const DetailsError = ({ onRetry }: { onRetry: () => void }) => {
  const colors = useColors();
  return (
    <section
      role="alert"
      css={{
        padding: 24,
        border: `1px solid ${colors.danger}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <h1 css={{ margin: 0, color: colors.danger, fontSize: 20 }}>
        Unable to load this session
      </h1>
      <p css={{ margin: "8px 0 16px", color: colors.textSecondary }}>
        It may no longer be available to you.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
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
