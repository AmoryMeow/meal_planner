import { type FormEvent, type RefObject, useEffect, useState } from "react";

import { useGroupsQuery } from "@package/groups";
import { type MealType, usePlansQuery } from "@package/plan";
import { Button, Dialog, Input, Select, useColors } from "@package/ui";

import { type CreatePokerSessionInput } from "./api";
import { useCreatePokerSessionMutation } from "./queries";

type CreatePokerSessionDialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
};

type FormErrors = Partial<Record<keyof CreatePokerSessionInput, string>>;

const ALL_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const getToday = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

export const CreatePokerSessionDialog = ({
  dialogRef,
}: CreatePokerSessionDialogProps) => {
  const colors = useColors();
  const groupsQuery = useGroupsQuery();
  const plansQuery = usePlansQuery();
  const creation = useCreatePokerSessionMutation();
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(getToday);
  const [mealType, setMealType] =
    useState<CreatePokerSessionInput["meal_type"]>("dinner");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const groups = groupsQuery.data ?? [];
  const selectedGroup = groups.find(group => String(group.id) === groupId);
  const selectedPlan = plansQuery.data?.find(
    plan => plan.id === selectedGroup?.plan_id
  );
  const enabledMealTypes = selectedPlan?.enabled_meal_types ?? ALL_MEAL_TYPES;

  useEffect(() => {
    if (groupId && groups.some(group => String(group.id) === groupId)) return;
    setGroupId(groups[0] ? String(groups[0].id) : "");
  }, [groupId, groups]);

  useEffect(() => {
    if (enabledMealTypes.includes(mealType)) return;
    setMealType(enabledMealTypes[0] ?? "dinner");
  }, [enabledMealTypes, mealType]);

  const resetForm = () => {
    setGroupId(groups[0] ? String(groups[0].id) : "");
    setDate(getToday());
    setMealType("dinner");
    setFormErrors({});
    creation.reset();
  };

  const clearStatus = (field: keyof CreatePokerSessionInput) => {
    creation.reset();
    setFormErrors(current => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    creation.reset();

    const nextErrors: FormErrors = {};
    const parsedGroupId = Number(groupId);
    if (!Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      nextErrors.group_id = "Required";
    }
    if (!date) nextErrors.date = "Required";
    setFormErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    creation.mutate(
      {
        group_id: parsedGroupId,
        date,
        meal_type: mealType,
      },
      { onSuccess: () => dialogRef.current?.close() }
    );
  };

  return (
    <Dialog
      dialogRef={dialogRef}
      title="Create Meal Poker"
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
          <Button
            type="submit"
            size="sm"
            loading={creation.isPending}
            disabled={groups.length === 0}
          >
            Create
          </Button>
        </>
      }
    >
      {groups.length > 0 ? (
        <>
          <Select
            label="Group"
            value={groupId}
            options={groups.map(group => ({
              value: String(group.id),
              label: group.name,
            }))}
            disabled={creation.isPending}
            required
            error={formErrors.group_id ?? creation.apiFieldErrors.group_id}
            onChange={value => {
              clearStatus("group_id");
              setGroupId(value);
            }}
          />
          <Input
            label="Date"
            type="date"
            name="poker-date"
            value={date}
            min={getToday()}
            required
            disabled={creation.isPending}
            error={formErrors.date ?? creation.apiFieldErrors.date}
            onChange={event => {
              clearStatus("date");
              setDate(event.target.value);
            }}
          />
          <Select
            label="Meal type"
            value={mealType}
            options={enabledMealTypes.map(value => ({
              value,
              label: mealTypeLabels[value],
            }))}
            disabled={creation.isPending}
            required
            error={formErrors.meal_type ?? creation.apiFieldErrors.meal_type}
            onChange={value => {
              clearStatus("meal_type");
              setMealType(value as CreatePokerSessionInput["meal_type"]);
            }}
          />
        </>
      ) : (
        <p css={{ margin: 0, color: colors.textSecondary }}>
          Create a group in Plans before starting Meal Poker.
        </p>
      )}

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
