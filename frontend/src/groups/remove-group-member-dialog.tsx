import { type RefObject } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type GroupMember } from "./api";
import { useRemoveGroupMemberMutation } from "./queries";

type RemoveGroupMemberDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  groupId: number;
  groupName: string;
  member: GroupMember;
  memberName: string;
  onClose: () => void;
};

export const RemoveGroupMemberDialog = ({
  dialogRef,
  groupId,
  groupName,
  member,
  memberName,
  onClose,
}: RemoveGroupMemberDialogProps) => {
  const colors = useColors();
  const removal = useRemoveGroupMemberMutation(groupId);

  const handleClose = () => {
    removal.reset();
    onClose();
  };

  const handleRemove = () => {
    removal.mutate(member.id, {
      onSuccess: () => dialogRef.current?.close(),
    });
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Remove member"
      onClose={handleClose}
      onCancel={event => {
        if (removal.isPending) event.preventDefault();
      }}
      closeDisabled={removal.isPending}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={removal.isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={removal.isPending}
            onClick={handleRemove}
          >
            Remove
          </Button>
        </>
      }
    >
      <p css={{ margin: 0, color: colors.textPrimary, lineHeight: 1.5 }}>
        Remove <strong>{memberName}</strong> from <strong>{groupName}</strong>?
      </p>
      <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
        This person will lose access to the group meal plan.
      </p>

      {removal.submitError ? (
        <div
          role="alert"
          css={{
            padding: "10px 12px",
            border: `1px solid ${colors.danger}`,
            borderRadius: 8,
            color: colors.danger,
            fontSize: 14,
          }}
        >
          {removal.submitError}
        </div>
      ) : null}
    </Dialog>
  );
};
