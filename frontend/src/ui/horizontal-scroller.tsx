import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useColors } from "./colors";

export type HorizontalScrollerProps = {
  ariaLabel: string;
  children: ReactNode;
  gap?: number;
  marginBottom?: number | string;
};

export const HorizontalScroller = ({
  ariaLabel,
  children,
  gap = 8,
  marginBottom = 0,
}: HorizontalScrollerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollBack: false,
    canScrollForward: false,
  });

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    setScrollState({
      hasOverflow: maxScrollLeft > 1,
      canScrollBack: viewport.scrollLeft > 1,
      canScrollForward: viewport.scrollLeft < maxScrollLeft - 1,
    });
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(viewport);
    resizeObserver.observe(content);
    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();

    return () => {
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      left: direction * Math.max(160, viewport.clientWidth * 0.75),
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-label={ariaLabel}
      css={{
        display: "grid",
        gridTemplateColumns: scrollState.hasOverflow
          ? "32px minmax(0, 1fr) 32px"
          : "minmax(0, 1fr)",
        alignItems: "center",
        gap: scrollState.hasOverflow ? 6 : 0,
        minWidth: 0,
        marginBottom,
      }}
    >
      {scrollState.hasOverflow ? (
        <ScrollButton
          direction="back"
          disabled={!scrollState.canScrollBack}
          onClick={() => scroll(-1)}
        />
      ) : null}

      <div
        ref={viewportRef}
        css={{
          minWidth: 0,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <div
          ref={contentRef}
          css={{
            display: "flex",
            alignItems: "center",
            gap,
            width: "max-content",
            minWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </div>

      {scrollState.hasOverflow ? (
        <ScrollButton
          direction="forward"
          disabled={!scrollState.canScrollForward}
          onClick={() => scroll(1)}
        />
      ) : null}
    </section>
  );
};

const ScrollButton = ({
  direction,
  disabled,
  onClick,
}: {
  direction: "back" | "forward";
  disabled: boolean;
  onClick: () => void;
}) => {
  const colors = useColors();
  const label = direction === "back" ? "Scroll filters left" : "Scroll filters right";

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      css={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        padding: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        background: colors.surface,
        color: colors.textPrimary,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.35 : 1,
        "&:hover:not(:disabled)": { borderColor: colors.primary },
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <ChevronIcon direction={direction} />
    </button>
  );
};

const ChevronIcon = ({ direction }: { direction: "back" | "forward" }) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    css={{ transform: direction === "back" ? "rotate(180deg)" : "none" }}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);
