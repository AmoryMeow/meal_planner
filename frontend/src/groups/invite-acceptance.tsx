import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuthSession } from "@package/auth";
import { Button, getContentContainerStyles, useColors, useIsMobile } from "@package/ui";

import { useAcceptGroupInviteMutation } from "./queries";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const InviteAcceptance = () => {
  const { token = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const colors = useColors();
  const isMobile = useIsMobile();
  const { signOut, status, user } = useAuthSession();
  const acceptance = useAcceptGroupInviteMutation(token);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const hasValidToken = UUID_PATTERN.test(token);

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true);
    acceptance.reset();
    try {
      await signOut();
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  return (
    <main
      css={{
        ...getContentContainerStyles(isMobile),
        flex: 1,
        display: "grid",
        placeItems: "center",
        paddingTop: 32,
        paddingBottom: 48,
      }}
    >
      <section
        aria-labelledby="invite-heading"
        css={{
          width: "100%",
          maxWidth: 520,
          boxSizing: "border-box",
          padding: isMobile ? 20 : 28,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          background: colors.surface,
          textAlign: "center",
        }}
      >
        <h1
          id="invite-heading"
          css={{ margin: 0, color: colors.textPrimary, fontSize: 24 }}
        >
          Group invitation
        </h1>

        {!hasValidToken ? <InvalidInvitation /> : null}
        {hasValidToken && status === "loading" ? <InviteStatus /> : null}
        {hasValidToken && status === "error" ? (
          <p role="alert" css={{ color: colors.danger }}>
            Unable to restore your session. Please reload the page.
          </p>
        ) : null}
        {hasValidToken && status === "anonymous" ? (
          <AnonymousInvitation location={location} />
        ) : null}
        {hasValidToken && status === "authenticated" && !acceptance.data ? (
          <div>
            <p css={{ margin: "12px 0 6px", color: colors.textSecondary }}>
              Continue as{" "}
              <strong css={{ color: colors.textPrimary }}>{user?.email}</strong>
            </p>
            <p css={{ margin: "0 0 20px", color: colors.textSecondary, fontSize: 14 }}>
              The invitation will only work for the email address it was sent to.
            </p>
            {acceptance.submitError ? (
              <p
                role="alert"
                css={{
                  margin: "0 0 16px",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: colors.dangerBg,
                  color: colors.danger,
                }}
              >
                {acceptance.submitError}
              </p>
            ) : null}
            <div
              css={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Button
                fullWidth={isMobile}
                loading={acceptance.isPending}
                onClick={() => acceptance.mutate()}
              >
                Accept invitation
              </Button>
              <Button
                variant="secondary"
                fullWidth={isMobile}
                loading={isSwitchingAccount}
                disabled={acceptance.isPending}
                onClick={() => void handleSwitchAccount()}
              >
                Use another account
              </Button>
            </div>
          </div>
        ) : null}
        {acceptance.data ? (
          <div>
            <p css={{ margin: "12px 0 6px", color: colors.success, fontWeight: 700 }}>
              Invitation accepted
            </p>
            <p css={{ margin: "0 0 20px", color: colors.textSecondary }}>
              You are now a member of {acceptance.data.name}.
            </p>
            <Button onClick={() => navigate(`/plans/${acceptance.data.plan_id}`)}>
              Open group plan
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
};

const AnonymousInvitation = ({
  location,
}: {
  location: ReturnType<typeof useLocation>;
}) => {
  const colors = useColors();
  const returnState = { from: location };

  return (
    <div>
      <p css={{ margin: "12px 0 20px", color: colors.textSecondary }}>
        Sign in or create an account to accept this invitation.
      </p>
      <div
        css={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}
      >
        <Link to="/login" state={returnState} css={linkStyles(colors.primary)}>
          Sign in
        </Link>
        <Link to="/register" state={returnState} css={linkStyles(colors.textPrimary)}>
          Create account
        </Link>
      </div>
    </div>
  );
};

const InvalidInvitation = () => {
  const colors = useColors();

  return (
    <p role="alert" css={{ margin: "12px 0 0", color: colors.danger }}>
      This invitation link is invalid.
    </p>
  );
};

const InviteStatus = () => {
  const colors = useColors();

  return (
    <p role="status" css={{ margin: "12px 0 0", color: colors.textSecondary }}>
      Restoring your session…
    </p>
  );
};

const linkStyles = (color: string) => ({
  minWidth: 120,
  minHeight: 44,
  boxSizing: "border-box" as const,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 18px",
  border: `1px solid ${color}`,
  borderRadius: 12,
  color,
  fontSize: 15,
  fontWeight: 700,
  textDecoration: "none",
  "&:hover": { opacity: 0.82 },
  "&:focus-visible": { outline: `3px solid ${color}`, outlineOffset: 2 },
});
