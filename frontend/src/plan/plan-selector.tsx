import { useMemo, useState } from "react";

import { Button, Combobox, type ComboboxOption, useIsMobile } from "@package/ui";

import { type MealPlan } from "./api";

type PlanSelectorProps = {
  plans: MealPlan[];
  selectedPlanIds: number[];
  onChange: (planIds: number[]) => void;
};

export const PlanSelector = ({
  plans,
  selectedPlanIds,
  onChange,
}: PlanSelectorProps) => {
  const isMobile = useIsMobile();
  const [inputValue, setInputValue] = useState("");
  const options = useMemo(() => plans.map(getPlanOption), [plans]);
  const selectedOptions = options.filter(option =>
    selectedPlanIds.includes(Number(option.id))
  );
  const filteredOptions = options.filter(option =>
    option.label.toLocaleLowerCase().includes(inputValue.trim().toLocaleLowerCase())
  );
  const allSelected = selectedPlanIds.length === plans.length;

  const orderPlanIds = (planIds: number[]) =>
    plans.filter(plan => planIds.includes(plan.id)).map(plan => plan.id);

  const handleSelect = (option: ComboboxOption) => {
    const planId = Number(option.id);
    onChange(orderPlanIds([...selectedPlanIds, planId]));
    setInputValue("");
  };

  const handleRemove = (option: ComboboxOption) => {
    if (selectedPlanIds.length === 1) return;
    onChange(selectedPlanIds.filter(planId => planId !== Number(option.id)));
  };

  return (
    <div
      css={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "flex-end",
        gap: 10,
        width: "100%",
        maxWidth: 640,
        marginBottom: 16,
      }}
    >
      <div css={{ minWidth: 0, width: "100%", flex: "1 1 auto" }}>
        <Combobox
          label="Calendars"
          inputValue={inputValue}
          options={filteredOptions}
          selectedOptions={selectedOptions}
          multiple
          placeholder="Choose a calendar"
          emptyMessage="No calendars found."
          onInputChange={setInputValue}
          onSelect={handleSelect}
          onRemove={handleRemove}
        />
      </div>
      <Button
        variant="secondary"
        size="md"
        fullWidth={isMobile}
        disabled={allSelected}
        onClick={() => onChange(plans.map(plan => plan.id))}
      >
        All plans
      </Button>
    </div>
  );
};

const getPlanOption = (plan: MealPlan): ComboboxOption => ({
  id: plan.id,
  label: `${plan.name} (${plan.scope === "group" ? "Group" : "Personal"})`,
});
