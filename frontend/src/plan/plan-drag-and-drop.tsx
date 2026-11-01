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
import { createContext, type ReactNode, useContext, useState } from "react";

import { hexToRgba, useColors } from "@package/ui";

import { type PlanItem } from "./api";
import { useUpdatePlanItemMutation } from "./queries";
import { type MealType } from "./types";

type PlanItemDragData = {
  kind: "plan-item";
  planItem: PlanItem;
  variant: PlanItemDragVariant;
};

type PlanItemDragVariant = "default" | "compact";

type ActivePlanItem = PlanItemDragData & {
  width?: number;
  height?: number;
};

type PlanDropTargetData = {
  kind: "plan-target";
  date: string;
  mealType?: MealType;
};

type PlanDragContextValue = {
  dragDisabled: boolean;
};

type PlanDragAndDropProviderProps = {
  children: ReactNode;
};

type PlanDropTarget = {
  id: string;
  date: string;
  mealType?: MealType;
  disabled?: boolean;
};

const PlanDragContext = createContext<PlanDragContextValue | null>(null);

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const screenReaderInstructions = {
  draggable:
    "Press enter to edit this planned meal. To move it, press space, use the arrow keys to choose another day or meal section, then press space again to drop. Press escape to cancel.",
};

const announcements: Announcements = {
  onDragStart({ active }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    return planItem ? `Picked up ${planItem.meal_snapshot.name}.` : undefined;
  },
  onDragOver({ active, over }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const target = getPlanDropTargetData(over?.data.current);
    if (!planItem) return undefined;
    return target
      ? `${planItem.meal_snapshot.name} is over ${getTargetLabel(target)}.`
      : `${planItem.meal_snapshot.name} is not over a calendar day.`;
  },
  onDragEnd({ active, over }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const target = getPlanDropTargetData(over?.data.current);
    if (!planItem) return undefined;
    return target
      ? `${planItem.meal_snapshot.name} was moved to ${getTargetLabel(target)}.`
      : `${planItem.meal_snapshot.name} was not moved.`;
  },
  onDragCancel({ active }) {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    return planItem
      ? `Moving ${planItem.meal_snapshot.name} was cancelled.`
      : undefined;
  },
};

export const PlanDragAndDropProvider = ({ children }: PlanDragAndDropProviderProps) => {
  const colors = useColors();
  const [activePlanItem, setActivePlanItem] = useState<ActivePlanItem | null>(null);
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
    const dragData = getPlanItemDragData(active.data.current);
    const initialRect = active.rect.current.initial;
    setActivePlanItem(
      dragData
        ? {
            ...dragData,
            width: initialRect?.width,
            height: initialRect?.height,
          }
        : null
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const planItem = getPlanItemDragData(active.data.current)?.planItem;
    const target = getPlanDropTargetData(over?.data.current);
    if (!planItem || !target) {
      setActivePlanItem(null);
      return;
    }

    const mealType = target.mealType ?? planItem.meal_type;
    if (planItem.date === target.date && planItem.meal_type === mealType) {
      setActivePlanItem(null);
      return;
    }

    movePlanItem.mutate({
      planItemId: planItem.id,
      input: {
        date: target.date,
        meal_type: mealType,
      },
      optimisticPlanItem: planItem,
    });
    setActivePlanItem(null);
  };

  return (
    <PlanDragContext.Provider value={{ dragDisabled: movePlanItem.isPending }}>
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
        {children}
        <DragOverlay dropAnimation={null}>
          {activePlanItem ? (
            <PlanItemDragPreview
              planItem={activePlanItem.planItem}
              variant={activePlanItem.variant}
              width={activePlanItem.width}
              height={activePlanItem.height}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </PlanDragContext.Provider>
  );
};

export const usePlanItemDraggable = (
  planItem: PlanItem,
  variant: PlanItemDragVariant = "default"
) => {
  const context = useContext(PlanDragContext);
  if (!context) {
    throw new Error("usePlanItemDraggable must be used inside PlanDragAndDropProvider");
  }

  const draggable = useDraggable({
    id: `plan-item:${planItem.id}`,
    data: { kind: "plan-item", planItem, variant } satisfies PlanItemDragData,
    disabled: context.dragDisabled,
  });

  return { ...draggable, dragDisabled: context.dragDisabled };
};

export const usePlanDropTarget = ({
  id,
  date,
  mealType,
  disabled = false,
}: PlanDropTarget) =>
  useDroppable({
    id,
    disabled,
    data: {
      kind: "plan-target",
      date,
      ...(mealType ? { mealType } : {}),
    } satisfies PlanDropTargetData,
  });

const PlanItemDragPreview = ({
  planItem,
  variant,
  width,
  height,
}: {
  planItem: PlanItem;
  variant: PlanItemDragVariant;
  width?: number;
  height?: number;
}) => {
  const colors = useColors();
  const isCompact = variant === "compact";

  return (
    <div
      css={{
        display: "flex",
        width,
        height,
        maxWidth: width ? undefined : isCompact ? 180 : 220,
        minWidth: 0,
        alignItems: "center",
        gap: isCompact ? 5 : 0,
        boxSizing: "border-box",
        padding: isCompact ? "5px 6px" : "9px 12px",
        border: `1px solid ${colors.primary}`,
        borderLeft: `3px solid ${colors.primary}`,
        borderRadius: isCompact ? 7 : 8,
        background: colors.surface,
        color: colors.textPrimary,
        boxShadow: `0 12px 28px ${hexToRgba(colors.textPrimary, 0.22)}`,
        fontSize: isCompact ? 11 : 13,
        fontWeight: 700,
        lineHeight: isCompact ? 1.25 : 1.3,
        pointerEvents: "none",
      }}
    >
      {isCompact ? (
        <span
          aria-hidden="true"
          css={{
            flex: "0 0 auto",
            color: colors.primary,
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          {planItem.meal_type.slice(0, 1).toUpperCase()}
        </span>
      ) : null}
      <span
        css={{
          minWidth: 0,
          overflow: "hidden",
          overflowWrap: isCompact ? "normal" : "anywhere",
          textOverflow: isCompact ? "ellipsis" : "clip",
          whiteSpace: isCompact ? "nowrap" : "normal",
        }}
      >
        {planItem.meal_snapshot.name}
      </span>
    </div>
  );
};

const getPlanItemDragData = (value: unknown): PlanItemDragData | null => {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value.kind === "plan-item" ? (value as PlanItemDragData) : null;
};

const getPlanDropTargetData = (value: unknown): PlanDropTargetData | null => {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  return value.kind === "plan-target" ? (value as PlanDropTargetData) : null;
};

const getTargetLabel = ({ date, mealType }: PlanDropTargetData): string => {
  const formattedDate = fullDateFormatter.format(new Date(`${date}T00:00:00`));
  return mealType ? `${mealTypeLabels[mealType]} on ${formattedDate}` : formattedDate;
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
