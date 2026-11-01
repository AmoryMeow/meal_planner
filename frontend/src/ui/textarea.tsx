import { type ChangeEvent, useId } from "react";

import { hexToRgba, useColors } from "./colors";

export type TextareaProps = {
  label?: string;
  name?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  rows?: number;
};

export const Textarea = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  rows = 3,
}: TextareaProps) => {
  const colors = useColors();
  const generatedId = useId();
  const inputId = name ? `${name}-${generatedId}` : generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      {label ? (
        <label
          htmlFor={inputId}
          css={{
            display: "block",
            marginBottom: 8,
            color: colors.textPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {label}
          {required ? (
            <span css={{ marginLeft: 4, color: colors.danger }}>*</span>
          ) : null}
        </label>
      ) : null}

      <textarea
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        css={{
          width: "100%",
          minHeight: 88,
          boxSizing: "border-box",
          resize: "vertical",
          padding: "10px 12px",
          border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
          borderRadius: 8,
          background: disabled ? colors.surfaceAlt : colors.background,
          color: disabled ? colors.textSecondary : colors.textPrimary,
          font: "inherit",
          "&:focus": {
            outline: "none",
            borderColor: error ? colors.danger : colors.primary,
            boxShadow: error
              ? `0 0 0 3px ${hexToRgba(colors.danger, 0.1)}`
              : `0 0 0 3px ${hexToRgba(colors.primary, 0.1)}`,
          },
          "&::placeholder": { color: colors.textMuted },
          "&:disabled": { opacity: 0.6 },
        }}
      />

      {error ? (
        <div
          id={errorId}
          role="alert"
          css={{
            marginTop: 6,
            color: colors.danger,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
};
