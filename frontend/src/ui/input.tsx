import { useId } from "react";

import { useColors, hexToRgba } from "@package/ui";

export interface InputProps {
  label?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
  name?: string;
  value: string;
  onChange: (e: any) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  flex?: boolean;
}

export const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className,
  flex = false,
}: InputProps) => {
  const colors = useColors();
  const generatedId = useId();
  const inputId = name ? `${name}-${generatedId}` : generatedId;

  return (
    <div className={className} css={flex ? { flex: 1 } : undefined}>
      {label && (
        <label
          htmlFor={inputId}
          css={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: colors.textPrimary,
            marginBottom: 8,
          }}
        >
          {label}
          {required && <span css={{ color: colors.danger, marginLeft: 4 }}>*</span>}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        css={{
          width: "100%",
          height: 44,
          padding: "0 16px",
          boxSizing: "border-box",
          borderRadius: 8,
          border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
          background: disabled ? colors.surfaceAlt : colors.background,
          color: disabled ? colors.textSecondary : colors.textPrimary,
          fontSize: 15,
          cursor: disabled ? "not-allowed" : "text",
          transition: "all 0.15s ease",
          "&:focus": {
            outline: "none",
            borderColor: error ? colors.danger : colors.primary,
            boxShadow: error
              ? `0 0 0 3px ${hexToRgba(colors.danger, 0.1)}`
              : `0 0 0 3px ${hexToRgba(colors.primary, 0.1)}`,
          },
          "&::placeholder": {
            color: colors.textMuted,
          },
          "&:disabled": {
            opacity: 0.6,
          },
        }}
      />

      {error && (
        <div
          css={{
            fontSize: 12,
            color: colors.danger,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
