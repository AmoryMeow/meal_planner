export const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

export const addWeeks = (date: Date, amount: number): Date => addDays(date, amount * 7);

export const addMonths = (date: Date, amount: number): Date => {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getStartOfMonth = (date: Date): Date => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getMonthGridDays = (monthStart: Date): Date[] => {
  const normalizedMonthStart = getStartOfMonth(monthStart);
  const gridStart = getStartOfWeek(normalizedMonthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const lastMonthDayIndex = days.reduce(
    (lastIndex, day, index) =>
      day.getFullYear() === normalizedMonthStart.getFullYear() &&
      day.getMonth() === normalizedMonthStart.getMonth()
        ? index
        : lastIndex,
    0
  );
  const visibleDayCount = Math.ceil((lastMonthDayIndex + 1) / 7) * 7;

  return days.slice(0, visibleDayCount);
};

export const getDateKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export const isSameDay = (first: Date, second: Date): boolean =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();
