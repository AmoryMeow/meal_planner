import { useId, useMemo } from "react";

import { useGroupsQuery } from "@package/groups";
import { Button, useColors } from "@package/ui";

import { type MealShareAccess } from "./api";
import {
  useCreateMealShareMutation,
  useDeleteMealShareMutation,
  useMealSharesQuery,
  useUpdateMealShareMutation,
} from "./meal-share-queries";

type MealSharingEditorProps = {
  mealId: number;
  disabled?: boolean;
};

export const MealSharingEditor = ({
  mealId,
  disabled = false,
}: MealSharingEditorProps) => {
  const colors = useColors();
  const headingId = useId();
  const groupsQuery = useGroupsQuery();
  const sharesQuery = useMealSharesQuery(mealId);
  const creation = useCreateMealShareMutation(mealId);
  const updating = useUpdateMealShareMutation(mealId);
  const removal = useDeleteMealShareMutation(mealId);
  const sharesByGroupId = useMemo(
    () => new Map(sharesQuery.data?.map(share => [share.group_id, share]) ?? []),
    [sharesQuery.data]
  );
  const isMutating = creation.isPending || updating.isPending || removal.isPending;
  const isDisabled = disabled || isMutating;
  const submitError =
    creation.submitError || updating.submitError || removal.submitError;

  const resetMutations = () => {
    creation.reset();
    updating.reset();
    removal.reset();
  };

  return (
    <section aria-labelledby={headingId}>
      <div css={{ marginBottom: 10 }}>
        <h3 id={headingId} css={{ margin: 0, color: colors.textPrimary, fontSize: 14 }}>
          Group access
        </h3>
        <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 13 }}>
          Choose which groups can use this meal. Access changes are saved immediately.
        </p>
      </div>

      {groupsQuery.isPending || sharesQuery.isPending ? (
        <p role="status" css={{ margin: 0, color: colors.textSecondary }}>
          Loading group access…
        </p>
      ) : null}

      {groupsQuery.isError || sharesQuery.isError ? (
        <div role="alert" css={{ color: colors.danger, fontSize: 14 }}>
          <p css={{ margin: "0 0 8px" }}>Unable to load group access.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void groupsQuery.refetch();
              void sharesQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {groupsQuery.isSuccess &&
      sharesQuery.isSuccess &&
      groupsQuery.data.length === 0 ? (
        <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
          Join or create a group to share this meal.
        </p>
      ) : null}

      {groupsQuery.isSuccess && sharesQuery.isSuccess && groupsQuery.data.length > 0 ? (
        <fieldset disabled={isDisabled} css={{ margin: 0, padding: 0, border: 0 }}>
          <ul
            css={{
              margin: 0,
              padding: 0,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              listStyle: "none",
              overflow: "hidden",
            }}
          >
            {groupsQuery.data.map((group, index) => {
              const share = sharesByGroupId.get(group.id);
              const isBeingCreated =
                creation.isPending && creation.variables?.group_id === group.id;
              const isBeingRemoved =
                removal.isPending && removal.variables === share?.id;
              const isShared = isBeingCreated || (Boolean(share) && !isBeingRemoved);

              return (
                <li
                  key={group.id}
                  css={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(120px, auto)",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderTop: index ? `1px solid ${colors.divider}` : 0,
                  }}
                >
                  <label
                    css={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: colors.textPrimary,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isShared}
                      onChange={event => {
                        resetMutations();
                        if (event.target.checked) {
                          creation.mutate({ group_id: group.id, access: "read" });
                        } else if (share) {
                          removal.mutate(share.id);
                        }
                      }}
                      css={{ width: 16, height: 16, accentColor: group.color }}
                    />
                    <span
                      aria-hidden="true"
                      css={{
                        width: 10,
                        height: 10,
                        flex: "0 0 auto",
                        borderRadius: "50%",
                        background: group.color,
                      }}
                    />
                    <span
                      css={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.name}
                    </span>
                  </label>

                  <label>
                    <span css={visuallyHiddenStyles}>Access for {group.name}</span>
                    <select
                      value={share?.access ?? "read"}
                      disabled={!share || isDisabled}
                      onChange={event => {
                        if (!share) return;
                        resetMutations();
                        updating.mutate({
                          shareId: share.id,
                          input: { access: event.target.value as MealShareAccess },
                        });
                      }}
                      css={{
                        width: "100%",
                        height: 36,
                        padding: "0 10px",
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        background: colors.background,
                        color: colors.textPrimary,
                        font: "inherit",
                        fontSize: 13,
                        cursor: !share || isDisabled ? "not-allowed" : "pointer",
                        "&:focus-visible": {
                          outline: `3px solid ${colors.focus}`,
                          outlineOffset: 1,
                        },
                      }}
                    >
                      <option value="read">Can view</option>
                      <option value="edit">Can edit</option>
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {submitError ? (
        <p role="alert" css={{ margin: "8px 0 0", color: colors.danger }}>
          {submitError}
        </p>
      ) : null}
    </section>
  );
};

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
