import { useEffect, useRef } from "react";

import { hexToRgba, useColors } from "@package/ui";

import { type MealPlan } from "./api";

type PlanSelectorProps = {
  plans: MealPlan[];
  selectedPlanIds: number[];
  size?: "sm" | "md";
  fullWidth?: boolean;
  onChange: (planIds: number[]) => void;
};

export const PlanSelector = ({
  plans,
  selectedPlanIds,
  size = "md",
  fullWidth = false,
  onChange,
}: PlanSelectorProps) => {
  const colors = useColors();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedPlans = plans.filter(plan => selectedPlanIds.includes(plan.id));
  const allSelected = selectedPlanIds.length === plans.length;
  const triggerLabel = allSelected
    ? "All plans"
    : selectedPlans.length === 1
      ? selectedPlans[0]?.name
      : `${selectedPlans.length} plans`;

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        detailsRef.current?.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") detailsRef.current?.removeAttribute("open");
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const orderPlanIds = (planIds: number[]) =>
    plans.filter(plan => planIds.includes(plan.id)).map(plan => plan.id);

  const handlePlanChange = (planId: number, checked: boolean) => {
    if (checked) {
      onChange(orderPlanIds([...selectedPlanIds, planId]));
      return;
    }
    if (selectedPlanIds.length > 1) {
      onChange(selectedPlanIds.filter(selectedId => selectedId !== planId));
    }
  };

  const handleAllChange = (checked: boolean) => {
    if (checked) {
      onChange(plans.map(plan => plan.id));
      return;
    }
    const personalPlan = plans.find(plan => plan.scope === "personal") ?? plans[0];
    if (personalPlan) onChange([personalPlan.id]);
  };

  return (
    <details
      ref={detailsRef}
      css={{ position: "relative", width: fullWidth ? "100%" : "auto" }}
    >
      <summary
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minWidth: 116,
          width: fullWidth ? "100%" : "auto",
          maxWidth: fullWidth ? "none" : 180,
          height: size === "sm" ? 36 : 40,
          boxSizing: "border-box",
          padding: "0 11px",
          border: `1px solid ${colors.border}`,
          borderRadius: 11,
          background: colors.surface,
          color: colors.textPrimary,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          listStyle: "none",
          "&::-webkit-details-marker": { display: "none" },
          "&:hover": { borderColor: colors.primary },
          "&:focus-visible": {
            outline: `2px solid ${colors.focus}`,
            outlineOffset: 2,
          },
        }}
      >
        <span
          css={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {triggerLabel}
        </span>
        <ChevronIcon />
      </summary>

      <div
        role="group"
        aria-label="Displayed plans"
        css={{
          position: "absolute",
          zIndex: 20,
          top: "calc(100% + 6px)",
          left: 0,
          width: fullWidth ? "min(260px, calc(200% + 8px))" : 260,
          boxSizing: "border-box",
          padding: 6,
          border: `1px solid ${colors.border}`,
          borderRadius: 11,
          background: colors.surface,
          boxShadow: `0 10px 28px ${hexToRgba(colors.textMuted, 0.22)}`,
        }}
      >
        <PlanCheckbox
          label="All plans"
          checked={allSelected}
          color={colors.primary}
          onChange={handleAllChange}
        />
        <div css={{ height: 1, margin: "5px 6px", background: colors.divider }} />
        {plans.map(plan => {
          const isSelected = selectedPlanIds.includes(plan.id);

          return (
            <PlanCheckbox
              key={plan.id}
              label={plan.name}
              description={plan.scope === "group" ? "Group" : "Personal"}
              checked={isSelected}
              disabled={isSelected && selectedPlanIds.length === 1}
              color={plan.color}
              onChange={checked => handlePlanChange(plan.id, checked)}
            />
          );
        })}
      </div>
    </details>
  );
};

const PlanCheckbox = ({
  label,
  description,
  checked,
  disabled = false,
  color,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  color: string;
  onChange: (checked: boolean) => void;
}) => {
  const colors = useColors();

  return (
    <label
      css={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        minHeight: 38,
        padding: "4px 8px",
        borderRadius: 7,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        "&:hover": disabled ? undefined : { background: colors.surfaceAlt },
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        css={{ width: 16, height: 16, flex: "0 0 auto", accentColor: color }}
      />
      <span
        aria-hidden="true"
        css={{
          width: 8,
          height: 8,
          flex: "0 0 auto",
          borderRadius: "50%",
          background: color,
        }}
      />
      <span css={{ minWidth: 0, flex: 1 }}>
        <span
          css={{
            display: "block",
            overflow: "hidden",
            color: colors.textPrimary,
            fontSize: 13,
            fontWeight: 600,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {description ? (
          <span css={{ display: "block", color: colors.textMuted, fontSize: 11 }}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
};

const ChevronIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    css={{ flex: "0 0 auto" }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
