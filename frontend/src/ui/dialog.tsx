import {
  type FormEventHandler,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  useId,
} from "react";

import { Button } from "./button";
import { hexToRgba, useColors } from "./colors";

export type DialogProps = {
  dialogRef: RefObject<HTMLDialogElement>;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  width?: number | string;
  closeDisabled?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onClose?: () => void;
  onCancel?: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

export const Dialog = ({
  dialogRef,
  title,
  children,
  actions,
  width = 520,
  closeDisabled = false,
  onSubmit,
  onClose,
  onCancel,
}: DialogProps) => {
  const colors = useColors();
  const titleId = useId();
  const content = (
    <>
      <header
        css={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 20px",
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <h2 id={titleId} css={{ margin: 0, fontSize: 20 }}>
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          icon={<CloseIcon />}
          ariaLabel="Close"
          disabled={closeDisabled}
          onClick={() => dialogRef.current?.close()}
        />
      </header>

      <div
        css={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: 20,
        }}
      >
        {children}
      </div>

      {actions ? (
        <footer
          css={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 20px",
            borderTop: `1px solid ${colors.divider}`,
          }}
        >
          {actions}
        </footer>
      ) : null}
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onCancel}
      css={{
        width: `min(${typeof width === "number" ? `${width}px` : width}, calc(100% - 32px))`,
        boxSizing: "border-box",
        overflow: "visible",
        padding: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        background: colors.surface,
        color: colors.textPrimary,
        boxShadow: `0 24px 64px ${hexToRgba(colors.textMuted, 0.35)}`,
        "&::backdrop": {
          background: hexToRgba(colors.textMuted, 0.55),
        },
      }}
    >
      {onSubmit ? <form onSubmit={onSubmit}>{content}</form> : content}
    </dialog>
  );
};

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);
