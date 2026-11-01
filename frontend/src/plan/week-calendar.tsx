import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";

import { Button, hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { addDays, getDateKey, isSameDay } from "./date-utils";
import { useUpdatePlanItemMutation } from "./queries";
import { type MealType } from "./types";

type WeekCalendarProps = {
  weekStart: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  isMobile: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

type PlanItemDragData = {
  kind: "plan-item";
  planItem: PlanItem;
};

type PlanSlotDropData = {
  kind: "plan-slot";
  date: string;
  mealType: MealType;
};

type DayTabDropData = {
  kind: "day-tab";
  date: string;
};

const screenReaderInstructions = {
  draggable:
    "Press enter to edit this planned meal. To move it, press space, use the arrow keys to choose another meal section, then press space again to drop. Press escape to cancel.",
};

const announcements: Announcements = {
  onDragStart({ active }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    return planItem ? `Picked up ${planItem.meal_snapshot.name}.` : undefined;
  },
  onDragOver({ active, over }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const slot = getPlanSlotDropData(over?.data.current);
    const dayTab = getDayTabDropData(over?.data.current);
    if (!planItem) return undefined;
    if (dayTab) {
      return `${planItem.meal_snapshot.name} is over ${formatDateKey(dayTab.date)}.`;
    }
    if (!slot) return `${planItem.meal_snapshot.name} is not over a meal section.`;
    return `${planItem.meal_snapshot.name} is over ${getSlotLabel(slot)}.`;
  },
  onDragEnd({ active, over }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const slot = getPlanSlotDropData(over?.data.current);
    if (!planItem) return undefined;
    return slot
      ? `${planItem.meal_snapshot.name} was moved to ${getSlotLabel(slot)}.`
      : `${planItem.meal_snapshot.name} was not moved.`;
  },
  onDragCancel({ active }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    return planItem
      ? `Moving ${planItem.meal_snapshot.name} was cancelled.`
      : undefined;
  },
};

const planKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { context, currentCoordinates }
) => {
  const direction = getKeyboardDirection(event.code);
  const activeRect = context.collisionRect;
  if (!direction || !activeRect) return undefined;

  const activeCenter = {
    x: activeRect.left + activeRect.width / 2,
    y: activeRect.top + activeRect.height / 2,
  };
  const candidates = context.droppableContainers
    .getEnabled()
    .map(container => {
      const rect = context.droppableRects.get(container.id);
      if (!rect) return null;
      return {
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    )
    .filter(({ center }) => isInDirection(center, activeCenter, direction))
    .sort(
      (first, second) =>
        getDirectionalDistance(first.center, activeCenter, direction) -
        getDirectionalDistance(second.center, activeCenter, direction)
    );
  const target = candidates[0];
  if (!target) return undefined;

  return {
    x: currentCoordinates.x + target.center.x - activeCenter.x,
    y: currentCoordinates.y + target.center.y - activeCenter.y,
  };
};

export const WeekCalendar = ({
  weekStart,
  mealTypes,
  planItems,
  isMobile,
  onAddMeal,
  onEditPlanItem,
}: WeekCalendarProps) => {
  const colors = useColors();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [activePlanItem, setActivePlanItem] = useState<PlanItem | null>(null);
  const movePlanItem = useUpdatePlanItemMutation();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: planKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    })
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    movePlanItem.reset();
    setActivePlanItem(getPlanItemDragData(active.data.current)?.planItem ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const slot = getPlanSlotDropData(over?.data.current);
    if (!planItem || !slot) {
      setActivePlanItem(null);
      return;
    }
    if (planItem.date === slot.date && planItem.meal_type === slot.mealType) {
      setActivePlanItem(null);
      return;
    }

    movePlanItem.mutate({
      planItemId: planItem.id,
      input: {
        date: slot.date,
        meal_type: slot.mealType,
      },
      optimisticPlanItem: planItem,
    });
    setActivePlanItem(null);
  };

  if (mealTypes.length === 0) {
    return (
      <p
        role="status"
        css={{
          margin: 0,
          padding: 16,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          background: colors.surface,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        Enable at least one meal section in plan settings.
      </p>
    );
  }

  const calendar = isMobile ? (
    <MobileWeekCalendar
      key={getDateKey(weekStart)}
      days={days}
      mealTypes={mealTypes}
      planItems={planItems}
      dragDisabled={movePlanItem.isPending}
      onAddMeal={onAddMeal}
      onEditPlanItem={onEditPlanItem}
    />
  ) : (
    <section aria-label="Weekly meal plan">
      <div css={{ overflowX: "auto", padding: "3px 3px 8px" }}>
        <div
          css={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            alignItems: "start",
            gap: 8,
            minWidth: 980,
          }}
        >
          {days.map(day => (
            <DayColumn
              key={getDateKey(day)}
              day={day}
              mealTypes={mealTypes}
              planItems={planItems}
              dragDisabled={movePlanItem.isPending}
              isToday={isSameDay(day, new Date())}
              onAddMeal={onAddMeal}
              onEditPlanItem={onEditPlanItem}
            />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      {movePlanItem.submitError ? (
        <div
          role="alert"
          css={{
            marginBottom: 10,
            padding: "10px 12px",
            border: `1px solid ${colors.danger}`,
            borderRadius: 8,
            color: colors.danger,
            fontSize: 14,
          }}
        >
          {movePlanItem.submitError}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragCancel={() => setActivePlanItem(null)}
        onDragEnd={handleDragEnd}
      >
        {calendar}
        <DragOverlay dropAnimation={null}>
          {activePlanItem ? <PlanItemDragPreview planItem={activePlanItem} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

const MobileWeekCalendar = ({
  days,
  mealTypes,
  planItems,
  dragDisabled,
  onAddMeal,
  onEditPlanItem,
}: {
  days: Date[];
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  dragDisabled: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const todayIndex = days.findIndex(day => isSameDay(day, new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    todayIndex >= 0 ? todayIndex : 0
  );
  const selectedDay = days[selectedDayIndex] ?? days[0];

  if (!selectedDay) return null;

  return (
    <section aria-label="Weekly meal plan">
      <div
        role="group"
        aria-label="Choose day"
        css={{
          display: "grid",
          gridAutoColumns: "minmax(44px, 1fr)",
          gridAutoFlow: "column",
          gap: 4,
          marginBottom: 10,
          overflowX: "auto",
          padding: "2px 2px 6px",
        }}
      >
        {days.map((day, index) => (
          <MobileDayTab
            key={getDateKey(day)}
            day={day}
            isSelected={index === selectedDayIndex}
            onSelect={() => setSelectedDayIndex(index)}
          />
        ))}
      </div>

      <div>
        <DayColumn
          day={selectedDay}
          mealTypes={mealTypes}
          planItems={planItems}
          dragDisabled={dragDisabled}
          isToday={isSameDay(selectedDay, new Date())}
          onAddMeal={onAddMeal}
          onEditPlanItem={onEditPlanItem}
        />
      </div>
    </section>
  );
};

const MobileDayTab = ({
  day,
  isSelected,
  onSelect,
}: {
  day: Date;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const isToday = isSameDay(day, new Date());
  const { isOver, setNodeRef } = useDroppable({
    id: `plan-day-tab:${dateKey}`,
    data: { kind: "day-tab", date: dateKey } satisfies DayTabDropData,
  });

  useEffect(() => {
    if (isOver && !isSelected) onSelect();
  }, [isOver, isSelected, onSelect]);

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={isSelected}
      aria-label={fullDateFormatter.format(day)}
      onClick={onSelect}
      css={{
        display: "flex",
        minHeight: 48,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "5px 4px",
        border: `1px solid ${isSelected || isOver ? colors.primary : colors.border}`,
        borderRadius: 9,
        background:
          isSelected || isOver ? hexToRgba(colors.primary, 0.12) : colors.surface,
        color: isSelected || isOver ? colors.primary : colors.textSecondary,
        font: "inherit",
        cursor: "pointer",
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <span css={{ fontSize: 11, fontWeight: 700 }}>
        {weekdayFormatter.format(day)}
      </span>
      <span css={{ fontSize: 13, fontWeight: 700 }}>{day.getDate()}</span>
      {isToday ? (
        <span
          aria-hidden="true"
          css={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: colors.primary,
          }}
        />
      ) : null}
    </button>
  );
};

const DayColumn = ({
  day,
  mealTypes,
  planItems,
  dragDisabled,
  isToday,
  onAddMeal,
  onEditPlanItem,
}: {
  day: Date;
  mealTypes: readonly MealType[];
  planItems: PlanItem[];
  dragDisabled: boolean;
  isToday: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const dateKey = getDateKey(day);
  const dayHeadingId = `plan-day-${dateKey}`;
  const dayPlanItems = planItems.filter(item => item.date === dateKey);

  return (
    <article
      aria-labelledby={dayHeadingId}
      css={{
        minWidth: 0,
        overflow: "hidden",
        border: `1px solid ${isToday ? colors.primary : colors.border}`,
        borderRadius: 12,
        background: isToday ? hexToRgba(colors.primary, 0.025) : colors.surface,
        boxShadow: isToday ? `0 0 0 2px ${hexToRgba(colors.primary, 0.1)}` : "none",
      }}
    >
      <header
        css={{
          minHeight: 58,
          boxSizing: "border-box",
          padding: "9px 10px",
          borderBottom: `1px solid ${colors.divider}`,
          background: isToday ? hexToRgba(colors.primary, 0.1) : colors.surfaceAlt,
        }}
      >
        <div
          css={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 5,
          }}
        >
          <h2
            id={dayHeadingId}
            title={fullDateFormatter.format(day)}
            css={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              margin: 0,
              color: colors.textPrimary,
              fontSize: 14,
              lineHeight: 1.3,
            }}
          >
            <span>{weekdayFormatter.format(day)}</span>
            <span
              css={{
                color: isToday ? colors.primary : colors.textSecondary,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {dateFormatter.format(day)}
            </span>
          </h2>
          {isToday ? (
            <span
              css={{
                color: colors.primary,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Today
            </span>
          ) : null}
        </div>
      </header>

      <div
        css={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 8,
        }}
      >
        {mealTypes.map(mealType => (
          <MealSection
            key={mealType}
            date={day}
            mealType={mealType}
            planItems={dayPlanItems.filter(item => item.meal_type === mealType)}
            dragDisabled={dragDisabled}
            onAddMeal={onAddMeal}
            onEditPlanItem={onEditPlanItem}
          />
        ))}
      </div>
    </article>
  );
};

const MealSection = ({
  date,
  mealType,
  planItems,
  dragDisabled,
  onAddMeal,
  onEditPlanItem,
}: {
  date: Date;
  mealType: MealType;
  planItems: PlanItem[];
  dragDisabled: boolean;
  onAddMeal: (date: Date, mealType: MealType) => void;
  onEditPlanItem: (planItem: PlanItem) => void;
}) => {
  const colors = useColors();
  const label = mealTypeLabels[mealType];
  const dateKey = getDateKey(date);
  const sectionHeadingId = `plan-${dateKey}-${mealType}`;
  const { isOver, setNodeRef } = useDroppable({
    id: `plan-slot:${dateKey}:${mealType}`,
    data: {
      kind: "plan-slot",
      date: dateKey,
      mealType,
    } satisfies PlanSlotDropData,
  });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={sectionHeadingId}
      css={{
        display: "flex",
        minHeight: 96,
        flexDirection: "column",
        boxSizing: "border-box",
        padding: 8,
        border: `1px solid ${isOver ? colors.primary : colors.border}`,
        borderRadius: 9,
        background: isOver ? hexToRgba(colors.primary, 0.1) : colors.surfaceAlt,
        boxShadow: isOver
          ? `inset 0 0 0 1px ${hexToRgba(colors.primary, 0.35)}`
          : "none",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
    >
      <h3
        id={sectionHeadingId}
        css={{
          margin: "0 0 8px",
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {label}
      </h3>

      {planItems.length > 0 ? (
        <ul
          aria-label={`${label} meals`}
          css={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            margin: "0 0 8px",
            padding: 0,
            listStyle: "none",
          }}
        >
          {planItems.map(planItem => (
            <li key={planItem.id}>
              <PlanItemCard
                planItem={planItem}
                dragDisabled={dragDisabled}
                onEdit={() => onEditPlanItem(planItem)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div
        css={{
          marginTop: "auto",
          "& > button": {
            borderStyle: "dashed",
            color: colors.textSecondary,
          },
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon={<PlusIcon />}
          ariaLabel={`Add meal to ${label.toLowerCase()} on ${fullDateFormatter.format(date)}`}
          onClick={() => onAddMeal(date, mealType)}
        >
          Add
        </Button>
      </div>
    </section>
  );
};

const PlanItemCard = ({
  planItem,
  dragDisabled,
  onEdit,
}: {
  planItem: PlanItem;
  dragDisabled: boolean;
  onEdit: () => void;
}) => {
  const colors = useColors();
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `plan-item:${planItem.id}`,
    data: { kind: "plan-item", planItem } satisfies PlanItemDragData,
    disabled: dragDisabled,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      aria-label={`${planItem.meal_snapshot.name}. Press Enter to edit or Space to move.`}
      disabled={dragDisabled}
      onClick={onEdit}
      css={{
        display: "block",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        padding: "7px 9px",
        border: `1px solid ${colors.border}`,
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: 8,
        background: colors.surface,
        color: colors.textPrimary,
        font: "inherit",
        textAlign: "left",
        cursor: dragDisabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.35 : 1,
        transition: "border-color 0.15s ease",
        touchAction: "manipulation",
        "&:hover": {
          borderColor: colors.primary,
          borderLeftColor: colors.primary,
        },
        "&:focus": { outline: "none" },
        "&:focus-visible": {
          outline: `2px solid ${colors.focus}`,
          outlineOffset: 2,
        },
      }}
    >
      <span
        css={{
          display: "block",
          margin: 0,
          overflowWrap: "anywhere",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.3,
        }}
      >
        {planItem.meal_snapshot.name}
      </span>
    </button>
  );
};

const PlanItemDragPreview = ({ planItem }: { planItem: PlanItem }) => {
  const colors = useColors();

  return (
    <div
      css={{
        maxWidth: 220,
        padding: "9px 12px",
        border: `1px solid ${colors.primary}`,
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: 8,
        background: colors.surface,
        color: colors.textPrimary,
        boxShadow: `0 12px 28px ${hexToRgba(colors.textPrimary, 0.22)}`,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.3,
        overflowWrap: "anywhere",
        pointerEvents: "none",
      }}
    >
      {planItem.meal_snapshot.name}
    </div>
  );
};

const PlusIcon = () => (
  <svg
    aria-hidden="true"
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const getPlanItemDragData = (value: unknown): PlanItemDragData | null => {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value.kind === "plan-item" ? (value as PlanItemDragData) : null;
};

const getPlanSlotDropData = (value: unknown): PlanSlotDropData | null => {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value.kind === "plan-slot" ? (value as PlanSlotDropData) : null;
};

const getDayTabDropData = (value: unknown): DayTabDropData | null => {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value.kind === "day-tab" ? (value as DayTabDropData) : null;
};

const getSlotLabel = ({ date, mealType }: PlanSlotDropData): string => {
  const parsedDate = new Date(`${date}T00:00:00`);
  return `${mealTypeLabels[mealType].toLowerCase()} on ${fullDateFormatter.format(parsedDate)}`;
};

const formatDateKey = (date: string): string =>
  fullDateFormatter.format(new Date(`${date}T00:00:00`));

type KeyboardDirection = "up" | "right" | "down" | "left";

type Point = {
  x: number;
  y: number;
};

const getKeyboardDirection = (code: string): KeyboardDirection | null => {
  switch (code) {
    case KeyboardCode.Up:
      return "up";
    case KeyboardCode.Right:
      return "right";
    case KeyboardCode.Down:
      return "down";
    case KeyboardCode.Left:
      return "left";
    default:
      return null;
  }
};

const isInDirection = (
  candidate: Point,
  active: Point,
  direction: KeyboardDirection
): boolean => {
  switch (direction) {
    case "up":
      return candidate.y < active.y - 1;
    case "right":
      return candidate.x > active.x + 1;
    case "down":
      return candidate.y > active.y + 1;
    case "left":
      return candidate.x < active.x - 1;
  }
};

const getDirectionalDistance = (
  candidate: Point,
  active: Point,
  direction: KeyboardDirection
): number => {
  const horizontalDistance = Math.abs(candidate.x - active.x);
  const verticalDistance = Math.abs(candidate.y - active.y);
  return direction === "left" || direction === "right"
    ? horizontalDistance + verticalDistance * 2
    : verticalDistance + horizontalDistance * 2;
};
