import { type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableListProps<T> {
  items: T[];
  onSortEnd: (newItems: T[]) => void;
  renderItem: (item: T, index: number, knob?: ReactNode) => ReactNode;
  className?: string;
}

function SortableItemWrapper<T extends { id: number | string }>({
  item,
  index,
  renderItem,
  knob,
}: {
  item: T;
  index: number;
  renderItem: (item: T, index: number, knob?: ReactNode) => ReactNode;
  knob?: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {renderItem(item, index, knob)}
    </div>
  );
}

export function SortableList<T extends { id: number | string }>({
  items,
  onSortEnd,
  renderItem,
  className = '',
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onSortEnd(newItems);
    }
  };

  const knob = (
    <div className="text-muted-foreground hover:text-foreground flex-shrink-0 pointer-events-none">
      <GripVertical className="h-4 w-4" />
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className={`space-y-2 ${className}`}>
          {items.map((item, index) => (
            <SortableItemWrapper
              key={item.id}
              item={item}
              index={index}
              renderItem={renderItem}
              knob={knob}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
