import { useRef } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { useCancelPokerSessionMutation } from "./queries";

export const CancelSessionButton = ({
  sessionId,
  disabled = false,
}: {
  sessionId: number;
  disabled?: boolean;
}) => {
  const colors = useColors();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancellation = useCancelPokerSessionMutation(sessionId);

  const openDialog = () => {
    cancellation.reset();
    dialogRef.current?.showModal();
  };

  const cancelSession = () => {
    cancellation.mutate(undefined, {
      onSuccess: () => dialogRef.current?.close(),
    });
  };

  return (
    <>
      <Button variant="danger" size="sm" disabled={disabled} onClick={openDialog}>
        Cancel session
      </Button>

      <Dialog
        dialogRef={dialogRef}
        title="Cancel Meal Poker session?"
        width={460}
        closeDisabled={cancellation.isPending}
        onCancel={event => {
          if (cancellation.isPending) event.preventDefault();
        }}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={cancellation.isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Keep session
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancellation.isPending}
              onClick={cancelSession}
            >
              Cancel session
            </Button>
          </>
        }
      >
        <p css={{ margin: 0, color: colors.textSecondary, lineHeight: 1.5 }}>
          Participants will no longer be able to vote in this session. This action
          cannot be undone.
        </p>
        {cancellation.submitError ? (
          <p role="alert" css={{ margin: 0, color: colors.danger, fontSize: 14 }}>
            {cancellation.submitError}
          </p>
        ) : null}
      </Dialog>
    </>
  );
};
