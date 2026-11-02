import { Button, useColors } from "@package/ui";

type CalendarNavigationProps = {
  label: string;
  periodLabel: "week" | "month";
  isCurrentPeriod: boolean;
  isMobile: boolean;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
};

export const CalendarNavigation = ({
  label,
  periodLabel,
  isCurrentPeriod,
  isMobile,
  onPrevious,
  onToday,
  onNext,
}: CalendarNavigationProps) => {
  const colors = useColors();

  return (
    <nav
      aria-label={`${periodLabel === "week" ? "Week" : "Month"} navigation`}
      css={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gap: 8,
        width: isMobile ? "100%" : "auto",
      }}
    >
      <strong
        css={{
          width: isMobile ? "100%" : "auto",
          color: colors.textPrimary,
          fontSize: 14,
          textAlign: isMobile ? "left" : "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </strong>

      <div
        css={{
          display: isMobile ? "grid" : "flex",
          gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : undefined,
          alignItems: "center",
          gap: 8,
          width: isMobile ? "100%" : "auto",
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<PreviousIcon />}
          ariaLabel={`Previous ${periodLabel}`}
          fullWidth={isMobile}
          onClick={onPrevious}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={isCurrentPeriod}
          fullWidth={isMobile}
          onClick={onToday}
        >
          Today
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<NextIcon />}
          ariaLabel={`Next ${periodLabel}`}
          fullWidth={isMobile}
          onClick={onNext}
        />
      </div>
    </nav>
  );
};

const PreviousIcon = () => (
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
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const NextIcon = () => (
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
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);
