import { useColors, hexToRgba } from "@package/ui";

export const AuthButton = ({
  variant,
  onClick,
  label,
}: {
  variant: "primary" | "secondary";
  onClick: () => void;
  label: string;
}) => {
  const colors = useColors();
  const isPrimary = variant === "primary";

  return (
    <button
      css={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 44,
        minWidth: 120,
        padding: "0 20px",
        borderRadius: 12,
        border: isPrimary ? "1px solid transparent" : `1px solid ${colors.border}`,
        background: isPrimary ? colors.primary : colors.surface,
        color: isPrimary ? colors.onPrimary : colors.textPrimary,
        fontWeight: 600,
        fontSize: 15,
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: isPrimary
          ? `0 1px 0 ${hexToRgba(colors.border, 0.25)}`
          : `0 1px 0 ${hexToRgba(colors.border, 0.15)}`,
        transition: "all 0.15s ease",
        "&:hover": {
          background: isPrimary ? colors.primaryHover : colors.surfaceAlt,
          boxShadow: isPrimary
            ? `0 2px 8px ${hexToRgba(colors.primary, 0.25)}`
            : `0 2px 6px ${hexToRgba(colors.border, 0.2)}`,
          transform: "translateY(-1px)",
        },
        "&:active": {
          background: isPrimary ? colors.primaryActive : colors.surface,
          transform: "translateY(0)",
          boxShadow: isPrimary
            ? `0 1px 2px ${hexToRgba(colors.border, 0.3)}`
            : `0 1px 2px ${hexToRgba(colors.border, 0.2)}`,
        },
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${colors.focus}`,
        },
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
