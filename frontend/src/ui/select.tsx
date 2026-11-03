import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { hexToRgba, useColors } from "./colors";

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  label: string;
  value: string;
  options: SelectOption[];
  size?: "sm" | "md";
  hideLabel?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
};

export const Select = ({
  label,
  value,
  options,
  size = "md",
  hideLabel = false,
  fullWidth = size === "md",
  disabled = false,
  required = false,
  error,
  onChange,
}: SelectProps) => {
  const colors = useColors();
  const listboxId = useId();
  const labelId = useId();
  const valueId = useId();
  const errorId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const selectedIndex = Math.max(
    0,
    options.findIndex(option => option.value === value)
  );
  const selectedOption = options[selectedIndex];
  const height = size === "sm" ? 36 : 44;
  const fontSize = size === "sm" ? 13 : 15;

  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const show = () => {
    if (disabled || !buttonRef.current || options.length === 0) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 160);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    setPosition({ top: rect.bottom + 6, left: Math.max(8, left), width });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const selected = menuRef.current?.querySelector<HTMLButtonElement>(
      '[data-selected="true"]'
    );
    (selected ?? menuRef.current?.querySelector<HTMLButtonElement>("button"))?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        buttonRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      close();
    };
    const handleViewportChange = () => close();

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const optionButtons =
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button");

    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : options.length - 1;
      optionButtons?.[nextIndex]?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    optionButtons?.[nextIndex]?.focus();
  };

  return (
    <div
      css={{
        display: "grid",
        width: fullWidth ? "100%" : "max-content",
        minWidth: 0,
      }}
    >
      <span
        id={labelId}
        css={
          hideLabel
            ? visuallyHiddenStyles
            : {
                display: "block",
                marginBottom: 8,
                color: colors.textPrimary,
                fontSize: 14,
                fontWeight: 600,
              }
        }
      >
        {label}
        {required && !hideLabel ? (
          <span css={{ marginLeft: 4, color: colors.danger }}>*</span>
        ) : null}
      </span>

      <button
        ref={buttonRef}
        type="button"
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={event => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show();
          }
        }}
        css={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: fullWidth ? "100%" : "auto",
          minWidth: 0,
          height,
          boxSizing: "border-box",
          padding: size === "sm" ? "0 10px" : "0 12px",
          border: `1px solid ${error ? colors.danger : open ? colors.focus : colors.border}`,
          borderRadius: 8,
          background: disabled ? colors.surfaceAlt : colors.background,
          color: colors.textPrimary,
          font: "inherit",
          fontSize,
          whiteSpace: "nowrap",
          cursor: disabled ? "not-allowed" : "pointer",
          "&:focus-visible": {
            outline: "none",
            borderColor: error ? colors.danger : colors.focus,
            boxShadow: `inset 0 0 0 1px ${error ? colors.danger : colors.focus}`,
          },
          "&:disabled": { opacity: 0.6 },
        }}
      >
        <span
          id={valueId}
          css={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedOption?.label ?? label}
        </span>
        <ChevronIcon open={open} />
      </button>

      {error ? (
        <span
          id={errorId}
          role="alert"
          css={{ marginTop: 6, color: colors.danger, fontSize: 12 }}
        >
          {error}
        </span>
      ) : null}

      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={labelId}
              css={{
                position: "fixed",
                zIndex: 2000,
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: 240,
                overflowY: "auto",
                boxSizing: "border-box",
                padding: 5,
                border: `1px solid ${colors.border}`,
                borderRadius: 9,
                background: colors.surface,
                boxShadow: `0 10px 28px ${hexToRgba(colors.textMuted, 0.22)}`,
              }}
            >
              {options.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onKeyDown={event => handleOptionKeyDown(event, index)}
                    onClick={() => {
                      onChange(option.value);
                      close(true);
                    }}
                    css={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      width: "100%",
                      minHeight: 34,
                      padding: "7px 9px",
                      border: 0,
                      borderRadius: 6,
                      background: selected ? colors.surfaceAlt : "transparent",
                      color: colors.textPrimary,
                      font: "inherit",
                      fontSize: 13,
                      textAlign: "left",
                      cursor: "pointer",
                      "&:hover": { background: colors.surfaceAlt },
                      "&:focus-visible": {
                        outline: `2px solid ${colors.focus}`,
                        outlineOffset: -2,
                      },
                    }}
                  >
                    <span>{option.label}</span>
                    {selected ? <CheckIcon /> : null}
                  </button>
                );
              })}
            </div>,
            buttonRef.current?.closest("dialog") ?? document.body
          )
        : null}
    </div>
  );
};

const ChevronIcon = ({ open }: { open: boolean }) => (
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
    css={{ flex: "0 0 auto", transform: open ? "rotate(180deg)" : "none" }}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const visuallyHiddenStyles = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};
