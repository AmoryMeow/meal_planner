import React from "react";

import { useColors, hexToRgba } from "@package/ui";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export const Button = ({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = "left",
  children,
  onClick,
  className,
}: ButtonProps) => {
  const colors = useColors();

  const sizeConfig = {
    sm: {
      height: 36,
      padding: "0 16px",
      fontSize: 14,
      minWidth: 80,
      borderRadius: 8,
    },
    md: {
      height: 44,
      padding: "0 20px",
      fontSize: 15,
      minWidth: 120,
      borderRadius: 12,
    },
    lg: {
      height: 52,
      padding: "0 24px",
      fontSize: 16,
      minWidth: 140,
      borderRadius: 14,
    },
  };

  const getVariantStyles = () => {
    const base = {
      transition: "all 0.15s ease",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case "primary":
        return {
          ...base,
          background: colors.primary,
          color: colors.onPrimary,
          border: "1px solid transparent",
          boxShadow: `0 1px 0 ${hexToRgba(colors.border, 0.25)}`,
          "&:hover:not(:disabled)": !loading
            ? {
                background: colors.primaryHover,
                boxShadow: `0 2px 8px ${hexToRgba(colors.primary, 0.25)}`,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: colors.primaryActive,
                transform: "translateY(0)",
                boxShadow: `0 1px 2px ${hexToRgba(colors.border, 0.3)}`,
              }
            : {},
        };

      case "secondary":
        return {
          ...base,
          background: colors.surface,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
          boxShadow: `0 1px 0 ${hexToRgba(colors.border, 0.15)}`,
          "&:hover:not(:disabled)": !loading
            ? {
                background: colors.surfaceAlt,
                boxShadow: `0 2px 6px ${hexToRgba(colors.border, 0.2)}`,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: colors.surface,
                transform: "translateY(0)",
                boxShadow: `0 1px 2px ${hexToRgba(colors.border, 0.2)}`,
              }
            : {},
        };

      case "danger":
        return {
          ...base,
          background: colors.danger,
          color: "#FFFFFF",
          border: "1px solid transparent",
          boxShadow: `0 1px 0 ${hexToRgba(colors.danger, 0.3)}`,
          "&:hover:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.danger, 0.9),
                boxShadow: `0 2px 8px ${hexToRgba(colors.danger, 0.25)}`,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.danger, 0.8),
                transform: "translateY(0)",
                boxShadow: `0 1px 2px ${hexToRgba(colors.danger, 0.4)}`,
              }
            : {},
        };

      case "success":
        return {
          ...base,
          background: colors.success,
          color: "#FFFFFF",
          border: "1px solid transparent",
          boxShadow: `0 1px 0 ${hexToRgba(colors.success, 0.3)}`,
          "&:hover:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.success, 0.9),
                boxShadow: `0 2px 8px ${hexToRgba(colors.success, 0.25)}`,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.success, 0.8),
                transform: "translateY(0)",
                boxShadow: `0 1px 2px ${hexToRgba(colors.success, 0.4)}`,
              }
            : {},
        };

      case "ghost":
        return {
          ...base,
          background: "transparent",
          color: colors.textPrimary,
          border: "1px solid transparent",
          boxShadow: "none",
          "&:hover:not(:disabled)": !loading
            ? {
                background: colors.surfaceAlt,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: colors.surface,
                transform: "translateY(0)",
              }
            : {},
        };

      case "outline":
        return {
          ...base,
          background: "transparent",
          color: colors.primary,
          border: `1px solid ${colors.primary}`,
          boxShadow: "none",
          "&:hover:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.primary, 0.05),
                borderColor: colors.primaryHover,
                color: colors.primaryHover,
                transform: "translateY(-1px)",
              }
            : {},
          "&:active:not(:disabled)": !loading
            ? {
                background: hexToRgba(colors.primary, 0.1),
                borderColor: colors.primaryActive,
                color: colors.primaryActive,
                transform: "translateY(0)",
              }
            : {},
        };

      default:
        return base;
    }
  };

  const currentSize = sizeConfig[size];
  const variantStyles = getVariantStyles();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={className}
      css={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: icon && children ? 8 : 0,
        height: currentSize.height,
        minWidth: fullWidth ? "100%" : currentSize.minWidth,
        width: fullWidth ? "100%" : "auto",
        padding: currentSize.padding,
        borderRadius: currentSize.borderRadius,
        fontWeight: 600,
        fontSize: currentSize.fontSize,
        lineHeight: 1,
        fontFamily: "inherit",
        "&:focus-visible": {
          outline: "none",
          boxShadow: `0 0 0 3px ${colors.focus}`,
        },
        ...variantStyles,
      }}
      onClick={handleClick}
    >
      {loading && (
        <LoadingSpinner
          size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
          color={
            variant === "primary" || variant === "danger" || variant === "success"
              ? "#FFFFFF"
              : colors.textPrimary
          }
        />
      )}

      {!loading && icon && iconPosition === "left" && (
        <span css={{ display: "flex", alignItems: "center" }}>{icon}</span>
      )}

      {!loading && children && <span>{children}</span>}

      {!loading && icon && iconPosition === "right" && (
        <span css={{ display: "flex", alignItems: "center" }}>{icon}</span>
      )}
    </button>
  );
};

const LoadingSpinner = ({ size, color }: { size: number; color: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    css={{
      animation: "spin 1s linear infinite",
      "@keyframes spin": {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
    }}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" strokeOpacity="0.2" />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);
