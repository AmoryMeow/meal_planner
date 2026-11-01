import { Button, useColors } from "@package/ui";

type WeekNavigationProps = {
  weekStart: Date;
  isCurrentWeek: boolean;
  isMobile: boolean;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
};

const currentYearWeekFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const otherYearWeekFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const WeekNavigation = ({
  weekStart,
  isCurrentWeek,
  isMobile,
  onPrevious,
  onToday,
  onNext,
}: WeekNavigationProps) => {
  const colors = useColors();
  const weekEnd = addDays(weekStart, 6);

  return (
    <nav
      aria-label="Week navigation"
      css={{
        display: "flex",
        alignItems: "center",
        justifyContent: isMobile ? "space-between" : "flex-end",
        flexWrap: "wrap",
        gap: 8,
        width: isMobile ? "100%" : "auto",
      }}
    >
      <strong
        css={{
          minWidth: isMobile ? "100%" : 0,
          color: colors.textPrimary,
          fontSize: 14,
          textAlign: isMobile ? "left" : "center",
          whiteSpace: "nowrap",
        }}
      >
        {formatWeekRange(weekStart, weekEnd)}
      </strong>

      <div css={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          icon={<PreviousIcon />}
          ariaLabel="Previous week"
          onClick={onPrevious}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={isCurrentWeek}
          onClick={onToday}
        >
          Today
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<NextIcon />}
          ariaLabel="Next week"
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

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const formatWeekRange = (weekStart: Date, weekEnd: Date): string => {
  const currentYear = new Date().getFullYear();
  const isCurrentYear =
    weekStart.getFullYear() === currentYear && weekEnd.getFullYear() === currentYear;
  const formatter = isCurrentYear ? currentYearWeekFormatter : otherYearWeekFormatter;

  return formatter.formatRange(weekStart, weekEnd);
};
