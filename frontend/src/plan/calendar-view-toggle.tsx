import { SegmentedControl, type SegmentedControlOption } from "@package/ui";

import { type CalendarView } from "./types";

type CalendarViewToggleProps = {
  value: CalendarView;
  fullWidth?: boolean;
  onChange: (view: CalendarView) => void;
};

const options: readonly SegmentedControlOption<CalendarView>[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export const CalendarViewToggle = ({
  value,
  fullWidth,
  onChange,
}: CalendarViewToggleProps) => (
  <SegmentedControl
    ariaLabel="Calendar view"
    value={value}
    options={options}
    fullWidth={fullWidth}
    onChange={onChange}
  />
);
