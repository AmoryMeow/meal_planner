import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { hexToRgba, useColors } from "./colors";

export type ComboboxOption = {
  id: number | string;
  label: string;
};

export type ComboboxProps = {
  label: string;
  inputValue: string;
  options: ComboboxOption[];
  selectedOptions?: ComboboxOption[];
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  creating?: boolean;
  error?: string;
  emptyMessage?: string;
  onInputChange: (value: string) => void;
  onSelect: (option: ComboboxOption) => void;
  onRemove?: (option: ComboboxOption) => void;
  onClear?: () => void;
  onCreate?: (value: string) => void;
};

type MenuItem =
  | { type: "option"; option: ComboboxOption }
  | { type: "create"; value: string };

export const Combobox = ({
  label,
  inputValue,
  options,
  selectedOptions = [],
  multiple = false,
  placeholder,
  disabled = false,
  loading = false,
  creating = false,
  error,
  emptyMessage = "No options found.",
  onInputChange,
  onSelect,
  onRemove,
  onClear,
  onCreate,
}: ComboboxProps) => {
  const colors = useColors();
  const inputId = useId();
  const labelId = useId();
  const listboxId = useId();
  const errorId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const createValue = inputValue.trim();
  const hasExactMatch = options.some(
    option => normalize(option.label) === normalize(createValue)
  );
  const canCreate = Boolean(
    onCreate && createValue && !hasExactMatch && !loading && !creating
  );
  const menuItems: MenuItem[] = [
    ...options.map(option => ({ type: "option" as const, option })),
    ...(canCreate ? [{ type: "create" as const, value: createValue }] : []),
  ];
  const activeItemId =
    open && menuItems[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;
  const selectedLabel = selectedOptions[0]?.label ?? "";

  const dismiss = useCallback(() => {
    setOpen(false);
    const dismissedValue = multiple ? "" : selectedLabel;
    if (inputValue !== dismissedValue) onInputChange(dismissedValue);
    inputRef.current?.blur();
  }, [inputValue, multiple, onInputChange, selectedLabel]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue, options.length]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target)) {
        return;
      }

      dismiss();
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
  }, [dismiss]);

  const chooseItem = (item: MenuItem) => {
    if (item.type === "option") {
      const isSelected = selectedOptions.some(option => option.id === item.option.id);
      if (multiple && isSelected && onRemove) {
        onRemove(item.option);
      } else {
        if (!multiple) onInputChange(item.option.label);
        onSelect(item.option);
      }
    } else {
      onCreate?.(item.value);
    }
    if (!multiple) setOpen(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onInputChange(event.target.value);
    setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(current =>
        menuItems.length ? (current + 1) % menuItems.length : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex(current =>
        menuItems.length ? (current - 1 + menuItems.length) % menuItems.length : 0
      );
      return;
    }

    if (event.key === "Enter" && open && menuItems[highlightedIndex]) {
      event.preventDefault();
      chooseItem(menuItems[highlightedIndex]);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    dismiss();
  };

  const showMenu = open && !disabled;
  const visiblePlaceholder =
    multiple && selectedOptions.length > 0 ? "Add more…" : placeholder;

  return (
    <div ref={rootRef} onBlur={handleBlur}>
      <span
        id={labelId}
        css={{
          display: "block",
          marginBottom: 8,
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </span>

      <div css={{ position: "relative" }}>
        <div
          onPointerDown={event => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest("input, button")) return;
            dismiss();
          }}
          css={{
            display: "grid",
            gridTemplateColumns:
              multiple && selectedOptions.length > 0 && onClear
                ? "minmax(0, 1fr) auto"
                : "minmax(0, 1fr)",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
            boxSizing: "border-box",
            padding: multiple ? 6 : 0,
            border: error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
            borderRadius: 8,
            background: disabled ? colors.surfaceAlt : colors.background,
            cursor: disabled ? "not-allowed" : "text",
            "&:focus-within": {
              borderColor: error ? colors.danger : colors.primary,
              boxShadow: error
                ? `0 0 0 3px ${hexToRgba(colors.danger, 0.1)}`
                : `0 0 0 3px ${hexToRgba(colors.primary, 0.1)}`,
            },
          }}
        >
          <div
            css={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
              minWidth: 0,
            }}
          >
            {multiple
              ? selectedOptions.map(option => (
                  <span
                    key={option.id}
                    css={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 30,
                      paddingLeft: 10,
                      borderRadius: 999,
                      background: colors.chip,
                      color: colors.textPrimary,
                      fontSize: 13,
                    }}
                  >
                    <span>{option.label}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${option.label}`}
                      disabled={disabled}
                      onClick={() => onRemove?.(option)}
                      css={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        padding: 0,
                        border: 0,
                        borderRadius: "50%",
                        background: "transparent",
                        color: colors.textSecondary,
                        cursor: disabled ? "not-allowed" : "pointer",
                        "&:hover:not(:disabled)": {
                          background: hexToRgba(colors.textMuted, 0.08),
                          color: colors.textSecondary,
                        },
                        "&:focus-visible": {
                          outline: `2px solid ${colors.focus}`,
                          outlineOffset: -2,
                        },
                      }}
                    >
                      <RemoveIcon />
                    </button>
                  </span>
                ))
              : null}

            <input
              ref={inputRef}
              id={inputId}
              role="combobox"
              type="text"
              value={inputValue}
              placeholder={visiblePlaceholder}
              disabled={disabled}
              autoComplete="off"
              aria-autocomplete="list"
              aria-labelledby={labelId}
              aria-expanded={showMenu}
              aria-controls={listboxId}
              aria-activedescendant={activeItemId}
              aria-busy={loading || creating || undefined}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              onChange={handleChange}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              css={{
                flex: 1,
                minWidth: multiple ? 140 : "100%",
                height: multiple ? 30 : 42,
                boxSizing: "border-box",
                padding: multiple ? "0 8px" : "0 16px",
                border: 0,
                background: "transparent",
                color: disabled ? colors.textSecondary : colors.textPrimary,
                font: "inherit",
                cursor: disabled ? "not-allowed" : "text",
                outline: "none",
                "&::placeholder": { color: colors.textMuted },
                "&:disabled": { opacity: 0.6 },
              }}
            />
          </div>

          {multiple && selectedOptions.length > 0 && onClear ? (
            <button
              type="button"
              aria-label={`Clear all ${label.toLocaleLowerCase()}`}
              disabled={disabled}
              onClick={() => {
                onInputChange("");
                onClear();
              }}
              css={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                padding: 0,
                border: 0,
                borderRadius: 8,
                background: "transparent",
                color: colors.textSecondary,
                cursor: disabled ? "not-allowed" : "pointer",
                "&:hover:not(:disabled)": {
                  background: hexToRgba(colors.textMuted, 0.08),
                  color: colors.textPrimary,
                },
                "&:focus-visible": {
                  outline: `2px solid ${colors.focus}`,
                  outlineOffset: -2,
                },
              }}
            >
              <ClearIcon />
            </button>
          ) : null}
        </div>

        {showMenu ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            aria-label={label}
            css={{
              position: "absolute",
              zIndex: 10,
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              maxHeight: 240,
              overflowY: "auto",
              boxSizing: "border-box",
              margin: 0,
              padding: 6,
              listStyle: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              background: colors.surface,
              boxShadow: `0 10px 28px ${hexToRgba(colors.textMuted, 0.22)}`,
            }}
          >
            {loading ? (
              <MenuStatus>Loading…</MenuStatus>
            ) : menuItems.length ? (
              menuItems.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected =
                  item.type === "option" &&
                  selectedOptions.some(option => option.id === item.option.id);

                return (
                  <li key={getItemKey(item)} role="presentation">
                    <button
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      disabled={creating}
                      onMouseDown={event => event.preventDefault()}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => chooseItem(item)}
                      css={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        width: "100%",
                        padding: "10px 12px",
                        border: 0,
                        borderRadius: 7,
                        background: isHighlighted ? colors.surfaceAlt : "transparent",
                        color:
                          item.type === "create" ? colors.primary : colors.textPrimary,
                        font: "inherit",
                        fontWeight: item.type === "create" ? 600 : 400,
                        textAlign: "left",
                        cursor: creating ? "wait" : "pointer",
                      }}
                    >
                      <span>
                        {item.type === "option"
                          ? item.option.label
                          : creating
                            ? "Creating…"
                            : `Create “${item.value}”`}
                      </span>
                      {isSelected ? <CheckIcon /> : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <MenuStatus>{emptyMessage}</MenuStatus>
            )}
          </ul>
        ) : null}
      </div>

      {error ? (
        <div
          id={errorId}
          role="alert"
          css={{ marginTop: 6, color: colors.danger, fontSize: 12, lineHeight: 1.4 }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
};

const MenuStatus = ({ children }: { children: string }) => (
  <li role="status" css={{ padding: "10px 12px", color: "inherit", fontSize: 14 }}>
    {children}
  </li>
);

const RemoveIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="m7 7 10 10M17 7 7 17" />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    css={{ flexShrink: 0 }}
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const ClearIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

const getItemKey = (item: MenuItem): number | string =>
  item.type === "option" ? item.option.id : `create-${item.value}`;

const normalize = (value: string): string => value.trim().toLocaleLowerCase();
