import { type FormEvent, type RefObject, useState } from "react";

import { Button, Dialog, useColors } from "@package/ui";

import {
  emptyMealFormData,
  getMealInput,
  MealForm,
  type MealFormErrors,
} from "./meal-form";
import { useCreateMealMutation } from "./queries";

type CreateMealDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
};

export const CreateMealDialog = ({ dialogRef }: CreateMealDialogProps) => {
  const colors = useColors();
  const [formData, setFormData] = useState(emptyMealFormData);
  const [formErrors, setFormErrors] = useState<MealFormErrors>({});
  const creation = useCreateMealMutation();

  const resetForm = () => {
    setFormData(emptyMealFormData);
    setFormErrors({});
    creation.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    const input = getMealInput(formData);
    if (!input.name) {
      setFormErrors({ name: "Enter a meal name." });
      return;
    }

    setFormErrors({});
    creation.mutate(input, {
      onSuccess: () => dialogRef.current?.close(),
    });
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Add meal"
      onClose={resetForm}
      onCancel={event => {
        if (creation.isPending) event.preventDefault();
      }}
      onSubmit={handleSubmit}
      closeDisabled={creation.isPending}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={creation.isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={creation.isPending}>
            Create
          </Button>
        </>
      }
    >
      <MealForm
        data={formData}
        errors={{ ...creation.apiFieldErrors, ...formErrors }}
        disabled={creation.isPending}
        onChange={data => {
          setFormData(data);
          setFormErrors({});
          creation.reset();
        }}
      />

      {creation.submitError ? (
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
          {creation.submitError}
        </div>
      ) : null}
    </Dialog>
  );
};
