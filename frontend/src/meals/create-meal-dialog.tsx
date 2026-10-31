import {
  type ChangeEvent,
  type FormEvent,
  type RefObject,
  useId,
  useState,
} from "react";

import { Button, Dialog, hexToRgba, Input, useColors } from "@package/ui";

import { type MealSource } from "./api";
import { useCreateMealMutation } from "./queries";

type CreateMealDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
};

type FormData = {
  name: string;
  source: MealSource;
  tags: string;
};

const initialFormData: FormData = {
  name: "",
  source: "home",
  tags: "",
};

export const CreateMealDialog = ({ dialogRef }: CreateMealDialogProps) => {
  const colors = useColors();
  const sourceErrorId = useId();
  const [formData, setFormData] = useState(initialFormData);
  const [nameError, setNameError] = useState("");
  const creation = useCreateMealMutation();

  const resetForm = () => {
    setFormData(initialFormData);
    setNameError("");
    creation.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    const name = formData.name.trim();
    if (!name) {
      setNameError("Enter a meal name.");
      return;
    }

    setNameError("");
    creation.mutate(
      {
        name,
        source: formData.source,
        tags: parseTags(formData.tags),
      },
      {
        onSuccess: () => dialogRef.current?.close(),
      }
    );
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(previous => ({ ...previous, [name]: value }));
    creation.reset();

    if (name === "name") setNameError("");
  };

  const handleSourceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFormData(previous => ({
      ...previous,
      source: event.target.value as MealSource,
    }));
    creation.reset();
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
      <Input
        label="Name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="For example, vegetable soup"
        error={nameError || creation.apiFieldErrors.name}
        disabled={creation.isPending}
        required
      />

      <div>
        <label
          htmlFor="meal-source"
          css={{
            display: "block",
            marginBottom: 8,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Source
        </label>
        <select
          id="meal-source"
          value={formData.source}
          onChange={handleSourceChange}
          disabled={creation.isPending}
          aria-invalid={Boolean(creation.apiFieldErrors.source)}
          aria-describedby={creation.apiFieldErrors.source ? sourceErrorId : undefined}
          css={{
            width: "100%",
            height: 44,
            boxSizing: "border-box",
            padding: "0 12px",
            border: creation.apiFieldErrors.source
              ? `1px solid ${colors.danger}`
              : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: colors.background,
            color: colors.textPrimary,
            font: "inherit",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              borderColor: colors.focus,
            },
          }}
        >
          <option value="home">Home</option>
          <option value="restaurant">Restaurant</option>
          <option value="delivery">Delivery</option>
        </select>
        {creation.apiFieldErrors.source ? (
          <div
            id={sourceErrorId}
            css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
          >
            {creation.apiFieldErrors.source}
          </div>
        ) : null}
      </div>

      <Input
        label="Tags"
        name="tags"
        value={formData.tags}
        onChange={handleInputChange}
        placeholder="quick, vegetarian, weekend"
        error={creation.apiFieldErrors.tags}
        disabled={creation.isPending}
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

const parseTags = (value: string): string[] => [
  ...new Set(
    value
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean)
  ),
];
