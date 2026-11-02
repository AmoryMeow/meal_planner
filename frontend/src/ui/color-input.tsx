import { useId } from "react";

import { hexToRgba, useColors } from "./colors";

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export type ColorInputProps = {
  label?: string;
  name: string;
  value: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export const ColorInput = ({
  label = "Color",
  name,
  value,
  disabled = false,
  error,
  onChange,
}: ColorInputProps) => {
  const colors = useColors();
  const fieldId = useId();
  const errorId = useId();
  const pickerValue = HEX_COLOR_PATTERN.test(value) ? value : "#000000";

  return (
    <div>
      <label
        htmlFor={fieldId}
        css={{
          display: "block",
          marginBottom: 8,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      <div css={{ display: "flex", gap: 8 }}>
        <input
          type="color"
          value={pickerValue}
          disabled={disabled}
          aria-label={`Choose ${label.toLocaleLowerCase()}`}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value.toUpperCase())}
          css={{
            width: 48,
            height: 44,
            flex: "0 0 auto",
            boxSizing: "border-box",
            padding: 4,
            border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: colors.background,
            cursor: disabled ? "not-allowed" : "pointer",
            "&:focus-visible": {
              outline: `3px solid ${hexToRgba(colors.focus, 0.35)}`,
              outlineOffset: 1,
            },
          }}
        />
        <input
          id={fieldId}
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          required
          maxLength={7}
          placeholder="#0EA5E9"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value)}
          css={{
            width: "100%",
            height: 44,
            boxSizing: "border-box",
            padding: "0 12px",
            border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: disabled ? colors.surfaceAlt : colors.background,
            color: colors.textPrimary,
            font: "inherit",
            fontSize: 15,
            textTransform: "uppercase",
            "&:focus": {
              outline: "none",
              borderColor: error ? colors.danger : colors.primary,
              boxShadow: `0 0 0 3px ${hexToRgba(error ? colors.danger : colors.primary, 0.1)}`,
            },
          }}
        />
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          css={{ margin: "6px 0 0", color: colors.danger, fontSize: 12 }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
};
