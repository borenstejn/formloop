"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { RankQuestion } from "@/lib/types";
import type { ViewProps } from "../types";

function SortableItem({ id, label, index }: { id: string; label: string; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    background: "var(--color-card)",
    border: "1.5px solid var(--color-subtle)",
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "grab",
    fontSize: "1.0625rem",
    boxShadow: isDragging
      ? "0 8px 24px rgba(0,0,0,0.08)"
      : "0 1px 2px rgba(0,0,0,0.02)",
    userSelect: "none",
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          background: "var(--color-accent-soft)",
          color: "var(--color-accent)",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <GripVertical size={18} style={{ color: "var(--color-muted)" }} />
    </div>
  );
}

export function RankView({ question, value, onChange }: ViewProps<RankQuestion>) {
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(value) && (value as string[]).length === question.options.length) {
      return value as string[];
    }
    return [...question.options];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    onChange(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((curr) => {
      const oldIndex = curr.indexOf(active.id as string);
      const newIndex = curr.indexOf(over.id as string);
      return arrayMove(curr, oldIndex, newIndex);
    });
  }

  return (
    <div>
      <p
        style={{
          color: "var(--color-muted)",
          fontSize: 14,
          marginBottom: 12,
        }}
      >
        Drag pour réordonner — du plus important au moins important
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((id, i) => (
              <SortableItem key={id} id={id} label={id} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
