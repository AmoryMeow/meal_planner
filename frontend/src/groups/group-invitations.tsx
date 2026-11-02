import { type FormEvent, useState } from "react";

import { Button, Input, useColors, useIsMobile } from "@package/ui";

import { type GroupInvite } from "./api";
import {
  useCreateGroupInviteMutation,
  useGroupInvitesQuery,
  useRevokeGroupInviteMutation,
} from "./queries";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const expirationFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export const GroupInvitations = ({ groupId }: { groupId: number }) => {
  const colors = useColors();
  const isMobile = useIsMobile();
  const invitesQuery = useGroupInvitesQuery(groupId);
  const creation = useCreateGroupInviteMutation(groupId);
  const revocation = useRevokeGroupInviteMutation(groupId);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);
  const [copyError, setCopyError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();
    const normalizedEmail = email.trim().toLowerCase();
    const nextError = !normalizedEmail
      ? "Required"
      : EMAIL_PATTERN.test(normalizedEmail)
        ? ""
        : "Enter a valid email";
    setEmailError(nextError);
    if (nextError) return;

    creation.mutate(
      { email: normalizedEmail },
      {
        onSuccess: () => {
          setEmail("");
          setEmailError("");
        },
      }
    );
  };

  const handleCopy = async (invite: GroupInvite) => {
    setCopiedInviteId(null);
    setCopyError("");
    try {
      await navigator.clipboard.writeText(getInviteUrl(invite.token));
      setCopiedInviteId(invite.id);
    } catch {
      setCopyError("Unable to copy the invitation link.");
    }
  };

  return (
    <section
      aria-labelledby="group-invitations-heading"
      css={{
        marginTop: 24,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        background: colors.surface,
        overflow: "hidden",
      }}
    >
      <header
        css={{
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <h2
          id="group-invitations-heading"
          css={{ margin: 0, color: colors.textPrimary, fontSize: 18 }}
        >
          Invitations
        </h2>
        <p css={{ margin: "4px 0 0", color: colors.textSecondary, fontSize: 13 }}>
          Create a link for a person you want to add to this group.
        </p>
      </header>

      <form
        noValidate
        onSubmit={handleSubmit}
        css={{
          display: "flex",
          alignItems: "flex-end",
          flexDirection: isMobile ? "column" : "row",
          gap: 10,
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <Input
          label="Email"
          type="email"
          name="invite-email"
          value={email}
          required
          flex
          disabled={creation.isPending}
          error={emailError || creation.apiFieldErrors.email}
          placeholder="person@example.com"
          onChange={event => {
            creation.reset();
            setEmailError("");
            setEmail(event.target.value);
          }}
        />
        <Button
          type="submit"
          size="md"
          fullWidth={isMobile}
          loading={creation.isPending}
        >
          Create invitation
        </Button>
      </form>

      <div aria-live="polite" css={{ padding: "0 20px" }}>
        {creation.isSuccess ? (
          <p css={{ margin: "12px 0 0", color: colors.success, fontSize: 13 }}>
            Invitation created. Copy its link below.
          </p>
        ) : null}
        {creation.submitError ? (
          <p role="alert" css={{ margin: "12px 0 0", color: colors.danger }}>
            {creation.submitError}
          </p>
        ) : null}
        {revocation.submitError || copyError ? (
          <p role="alert" css={{ margin: "12px 0 0", color: colors.danger }}>
            {revocation.submitError || copyError}
          </p>
        ) : null}
        {copiedInviteId !== null ? (
          <p css={{ margin: "12px 0 0", color: colors.success, fontSize: 13 }}>
            Invitation link copied.
          </p>
        ) : null}
      </div>

      {invitesQuery.isPending ? (
        <p role="status" css={{ margin: 0, padding: 20, color: colors.textSecondary }}>
          Loading invitations…
        </p>
      ) : null}
      {invitesQuery.isError ? (
        <div role="alert" css={{ padding: 20, color: colors.danger }}>
          <p css={{ margin: "0 0 10px" }}>Unable to load invitations.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void invitesQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {invitesQuery.isSuccess && invitesQuery.data.length === 0 ? (
        <p css={{ margin: 0, padding: 20, color: colors.textSecondary }}>
          No pending invitations.
        </p>
      ) : null}
      {invitesQuery.isSuccess && invitesQuery.data.length > 0 ? (
        <ul css={{ margin: 0, padding: 0, listStyle: "none" }}>
          {invitesQuery.data.map((invite, index) => (
            <li
              key={invite.id}
              css={{
                display: "flex",
                alignItems: isMobile ? "stretch" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 12,
                padding: "12px 20px",
                borderTop: index === 0 ? undefined : `1px solid ${colors.divider}`,
              }}
            >
              <div css={{ minWidth: 0, flex: 1 }}>
                <div
                  css={{
                    color: colors.textPrimary,
                    fontSize: 14,
                    fontWeight: 700,
                    overflowWrap: "anywhere",
                  }}
                >
                  {invite.email}
                </div>
                <div
                  css={{
                    marginTop: 3,
                    color: invite.is_expired ? colors.danger : colors.textSecondary,
                    fontSize: 12,
                  }}
                >
                  {invite.is_expired
                    ? "Expired"
                    : `Expires ${expirationFormatter.format(new Date(invite.expires_at))}`}
                </div>
              </div>
              <div css={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={invite.is_expired}
                  onClick={() => void handleCopy(invite)}
                >
                  Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={revocation.isPending && revocation.variables === invite.id}
                  disabled={revocation.isPending}
                  onClick={() => {
                    revocation.reset();
                    revocation.mutate(invite.id);
                  }}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

const getInviteUrl = (token: string): string =>
  new URL(`/invite/${token}`, window.location.origin).toString();
