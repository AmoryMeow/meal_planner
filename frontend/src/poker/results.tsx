import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PokerMeal, type PokerSession } from "./api";
import {
  useAddPokerWinnerToPlanMutation,
  useCompletePokerSessionMutation,
  useRevealPokerSessionMutation,
} from "./queries";

type VotingControlsProps = {
  session: PokerSession;
};

export const VotingControls = ({ session }: VotingControlsProps) => {
  const colors = useColors();
  const revealing = useRevealPokerSessionMutation(session.id);
  const readyCount = session.participants.filter(
    participant => participant.is_ready
  ).length;
  const everyoneIsReady =
    session.participant_count > 0 && readyCount === session.participant_count;

  if (!session.can_manage) return null;

  return (
    <section
      aria-labelledby="poker-reveal-heading"
      css={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 14,
        marginTop: 16,
        padding: 18,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <div>
        <h2 id="poker-reveal-heading" css={{ margin: 0, fontSize: 17 }}>
          Reveal cards
        </h2>
        <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
          {everyoneIsReady
            ? "Everyone has submitted their choices."
            : `${readyCount} of ${session.participant_count} participants are ready.`}
        </p>
      </div>
      <Button
        size="sm"
        loading={revealing.isPending}
        disabled={!everyoneIsReady}
        onClick={() => revealing.mutate()}
      >
        Reveal cards
      </Button>
      {revealing.submitError ? (
        <p
          role="alert"
          css={{ flexBasis: "100%", margin: 0, color: colors.danger, fontSize: 14 }}
        >
          {revealing.submitError}
        </p>
      ) : null}
    </section>
  );
};

export const PokerResults = ({ session }: { session: PokerSession }) => {
  const colors = useColors();
  const navigate = useNavigate();
  const completing = useCompletePokerSessionMutation(session.id);
  const addingToPlan = useAddPokerWinnerToPlanMutation(session.id);
  const results = session.results ?? [];
  const highestScore = results[0]?.score;
  const leaders = useMemo(
    () => results.filter(result => result.score === highestScore),
    [highestScore, results]
  );
  const [selectedWinnerId, setSelectedWinnerId] = useState<number | null>(
    session.winner?.id ?? leaders[0]?.meal.id ?? null
  );
  const isTie = leaders.length > 1;
  const isCompleted = session.status === "completed";

  useEffect(() => {
    setSelectedWinnerId(session.winner?.id ?? leaders[0]?.meal.id ?? null);
  }, [leaders, session.winner?.id]);

  const complete = () => {
    completing.mutate(isTie && selectedWinnerId ? { winner_id: selectedWinnerId } : {});
  };

  return (
    <div css={{ display: "grid", gap: 16 }}>
      <section
        aria-labelledby="poker-results-heading"
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
            <h2 id="poker-results-heading" css={{ margin: 0, fontSize: 20 }}>
              Results
            </h2>
            <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 14 }}>
              First choice earns 3 points, second 2 and third 1.
            </p>
          </div>
          {session.winner ? <WinnerBadge meal={session.winner} /> : null}
        </div>

        {results.length ? (
          <ol
            css={{
              display: "grid",
              gap: 8,
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {results.map((result, index) => {
              const isLeader = result.score === highestScore;
              return (
                <li
                  key={result.meal.id}
                  css={{
                    display: "grid",
                    gridTemplateColumns: "34px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: `1px solid ${isLeader ? colors.primary : colors.border}`,
                    borderRadius: 12,
                    background: isLeader
                      ? hexToRgba(colors.primary, 0.08)
                      : colors.background,
                  }}
                >
                  <strong css={{ color: isLeader ? colors.primary : colors.textMuted }}>
                    {index + 1}
                  </strong>
                  <span css={{ minWidth: 0, overflowWrap: "anywhere" }}>
                    {result.meal.name}
                  </span>
                  <span css={{ color: colors.textSecondary, fontSize: 13 }}>
                    <strong css={{ color: colors.textPrimary }}>{result.score}</strong>{" "}
                    {result.score === 1 ? "point" : "points"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p css={{ color: colors.textSecondary }}>No results are available.</p>
        )}

        {!isCompleted && isTie && session.can_manage ? (
          <WinnerChoice
            meals={leaders.map(result => result.meal)}
            value={selectedWinnerId}
            disabled={completing.isPending}
            onChange={setSelectedWinnerId}
          />
        ) : null}

        {!isCompleted ? (
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
            {!session.can_manage ? (
              <span css={{ color: colors.textSecondary, fontSize: 14 }}>
                Waiting for the organizer to confirm the winner.
              </span>
            ) : null}
            {completing.submitError ? (
              <span role="alert" css={{ color: colors.danger, fontSize: 14 }}>
                {completing.submitError}
              </span>
            ) : null}
            {session.can_manage ? (
              <Button
                size="sm"
                loading={completing.isPending}
                disabled={!selectedWinnerId}
                onClick={complete}
              >
                {isTie ? "Choose winner" : "Confirm winner"}
              </Button>
            ) : null}
          </div>
        ) : (
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
            {addingToPlan.submitError ? (
              <span role="alert" css={{ color: colors.danger, fontSize: 14 }}>
                {addingToPlan.submitError}
              </span>
            ) : null}
            {session.plan_item_id ? (
              <>
                <span role="status" css={{ color: colors.success, fontSize: 14 }}>
                  Added to the group plan.
                </span>
                <Button variant="secondary" size="sm" onClick={() => navigate("/home")}>
                  Open plan
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                loading={addingToPlan.isPending}
                onClick={() => addingToPlan.mutate()}
              >
                Add to plan
              </Button>
            )}
          </div>
        )}
      </section>

      <ParticipantCards session={session} />
    </div>
  );
};

const WinnerChoice = ({
  meals,
  value,
  disabled,
  onChange,
}: {
  meals: PokerMeal[];
  value: number | null;
  disabled: boolean;
  onChange: (mealId: number) => void;
}) => {
  const colors = useColors();

  return (
    <fieldset disabled={disabled} css={{ margin: "18px 0 0", padding: 0, border: 0 }}>
      <legend css={{ marginBottom: 8, fontSize: 14, fontWeight: 700 }}>
        The leaders are tied. Choose the final winner:
      </legend>
      <div css={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {meals.map(meal => {
          const selected = meal.id === value;
          return (
            <label
              key={meal.id}
              css={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 12px",
                border: `1px solid ${selected ? colors.primary : colors.border}`,
                borderRadius: 10,
                background: selected
                  ? hexToRgba(colors.primary, 0.08)
                  : colors.background,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="radio"
                name="poker-winner"
                value={meal.id}
                checked={selected}
                onChange={() => onChange(meal.id)}
              />
              <span>{meal.name}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

const ParticipantCards = ({ session }: { session: PokerSession }) => {
  const colors = useColors();

  return (
    <section
      aria-labelledby="participant-cards-heading"
      css={{
        padding: 20,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
      }}
    >
      <h2 id="participant-cards-heading" css={{ margin: "0 0 12px", fontSize: 18 }}>
        Players’ cards
      </h2>
      <div
        css={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
          gap: 10,
        }}
      >
        {session.participants.map(participant => {
          const name =
            [participant.first_name, participant.last_name].filter(Boolean).join(" ") ||
            participant.email;
          return (
            <article
              key={participant.id}
              css={{
                minWidth: 0,
                padding: 14,
                borderRadius: 12,
                background: colors.surfaceAlt,
              }}
            >
              <h3
                css={{
                  margin: "0 0 9px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: 14,
                }}
              >
                {name}
              </h3>
              <ol css={{ display: "grid", gap: 6, margin: 0, paddingLeft: 24 }}>
                {(participant.votes ?? []).map(vote => (
                  <li key={vote.id} css={{ paddingLeft: 3, fontSize: 14 }}>
                    {vote.meal.name}
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
};

const WinnerBadge = ({ meal }: { meal: PokerMeal }) => {
  const colors = useColors();
  return (
    <span
      css={{
        padding: "5px 10px",
        borderRadius: 999,
        background: colors.successBg,
        color: colors.success,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      Winner: {meal.name}
    </span>
  );
};
