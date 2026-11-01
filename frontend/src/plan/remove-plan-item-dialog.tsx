import { type RefObject } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { useRemovePlanItemMutation } from "./queries";

type RemovePlanItemDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  planItem: PlanItem;
  onClose: () => void;
  onRemoved: () => void;
};

export const RemovePlanItemDialog = ({
  dialogRef,
  planItem,
  onClose,
  onRemoved,
}: RemovePlanItemDialogProps) => {
  const colors = useColors();
  const removal = useRemovePlanItemMutation();

  const handleClose = () => {
    removal.reset();
    onClose();
  };

  const handleRemove = () => {
    removal.mutate(planItem.id, {
      onSuccess: () => {
        dialogRef.current?.close();
        onRemoved();
      },
    });
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Remove from plan"
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
        Remove <strong>{planItem.meal_snapshot.name}</strong> from this meal plan?
      </p>
      <p css={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
        The meal will remain in your library.
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
