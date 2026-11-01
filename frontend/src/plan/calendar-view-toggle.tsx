import { SegmentedControl, type SegmentedControlOption } from "@package/ui";

import { type CalendarView } from "./types";

type CalendarViewToggleProps = {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
};

const options: readonly SegmentedControlOption<CalendarView>[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export const CalendarViewToggle = ({ value, onChange }: CalendarViewToggleProps) => (
  <SegmentedControl
    ariaLabel="Calendar view"
    value={value}
    options={options}
    onChange={onChange}
  />
);
