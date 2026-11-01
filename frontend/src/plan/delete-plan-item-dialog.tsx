import { type RefObject } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { useDeletePlanItemMutation } from "./queries";

type DeletePlanItemDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  planItem: PlanItem;
  onClose: () => void;
};

export const DeletePlanItemDialog = ({
  dialogRef,
  planItem,
  onClose,
}: DeletePlanItemDialogProps) => {
  const colors = useColors();
  const deletion = useDeletePlanItemMutation();

  const handleClose = () => {
    deletion.reset();
    onClose();
  };

  const handleDelete = () => {
    deletion.mutate(planItem.id, {
      onSuccess: () => dialogRef.current?.close(),
    });
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Remove from plan"
      onClose={handleClose}
      onCancel={event => {
        if (deletion.isPending) event.preventDefault();
      }}
      closeDisabled={deletion.isPending}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={deletion.isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            loading={deletion.isPending}
            onClick={handleDelete}
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

      {deletion.submitError ? (
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
          {deletion.submitError}
        </div>
      ) : null}
    </Dialog>
  );
};
