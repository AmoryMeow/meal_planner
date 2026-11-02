import { type FormEvent, type RefObject, useState } from "react";

import {
  Button,
  ColorInput,
  Dialog,
  HEX_COLOR_PATTERN,
  Input,
  useColors,
} from "@package/ui";

import { type CreateGroupInput } from "./api";
import { useCreateGroupMutation } from "./queries";

type CreateGroupDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
};

type GroupFormErrors = Partial<Record<keyof CreateGroupInput, string>>;

const DEFAULT_GROUP_COLOR = "#0EA5E9";

export const CreateGroupDialog = ({ dialogRef }: CreateGroupDialogProps) => {
  const colors = useColors();
  const creation = useCreateGroupMutation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_GROUP_COLOR);
  const [formErrors, setFormErrors] = useState<GroupFormErrors>({});

  const resetForm = () => {
    setName("");
    setColor(DEFAULT_GROUP_COLOR);
    setFormErrors({});
    creation.reset();
  };

  const clearStatus = (field: keyof CreateGroupInput) => {
    creation.reset();
    setFormErrors(current => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    const normalizedName = name.trim();
    const normalizedColor = color.toUpperCase();
    const nextErrors: GroupFormErrors = {};
    if (!normalizedName) nextErrors.name = "Required";
    if (!HEX_COLOR_PATTERN.test(normalizedColor)) nextErrors.color = "Use #RRGGBB";

    setFormErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setName(normalizedName);
    setColor(normalizedColor);
    creation.mutate(
      { name: normalizedName, color: normalizedColor },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Create group"
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
        label="Group name"
        name="group-name"
        value={name}
        required
        disabled={creation.isPending}
        error={formErrors.name ?? creation.apiFieldErrors.name}
        placeholder="Family"
        onChange={event => {
          clearStatus("name");
          setName(event.target.value);
        }}
      />
      <ColorInput
        label="Group color"
        name="group-color"
        value={color}
        disabled={creation.isPending}
        error={formErrors.color ?? creation.apiFieldErrors.color}
        onChange={value => {
          clearStatus("color");
          setColor(value);
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
