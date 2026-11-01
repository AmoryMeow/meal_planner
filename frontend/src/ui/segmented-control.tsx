import { hexToRgba, useColors } from "./colors";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: readonly SegmentedControlOption<T>[];
  onChange: (value: T) => void;
};

export const SegmentedControl = <T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) => {
  const colors = useColors();

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      css={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        border: `1px solid ${colors.border}`,
        borderRadius: 11,
        background: colors.surfaceAlt,
      }}
    >
      {options.map(option => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            css={{
              minWidth: 72,
              height: 32,
              padding: "0 12px",
              border: 0,
              borderRadius: 8,
              background: isSelected ? colors.primary : "transparent",
              color: isSelected ? colors.onPrimary : colors.textSecondary,
              boxShadow: isSelected
                ? `0 1px 3px ${hexToRgba(colors.textPrimary, 0.16)}`
                : "none",
              font: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition:
                "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
              "&:hover": isSelected
                ? { background: colors.primaryHover }
                : { background: colors.surface, color: colors.textPrimary },
              "&:focus-visible": {
                outline: `2px solid ${colors.focus}`,
                outlineOffset: 1,
              },
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
