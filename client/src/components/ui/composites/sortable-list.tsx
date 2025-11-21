import { ReactNode } from 'react';
import EasySortableList, { SortableItem, SortableKnob } from 'react-easy-sort';
import { GripVertical } from 'lucide-react';
import { arrayMoveImmutable } from 'array-move';

interface SortableListProps<T> {
  items: T[];
  onSortEnd: (newItems: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}

export function SortableList<T extends { id: number | string }>({
  items,
  onSortEnd,
  renderItem,
  className = '',
}: SortableListProps<T>) {
  const onSortEndHandler = (oldIndex: number, newIndex: number) => {
    const newItems = arrayMoveImmutable(items, oldIndex, newIndex);
    onSortEnd(newItems);
  };

  return (
    <EasySortableList onSortEnd={onSortEndHandler} className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <SortableItem key={item.id}>
          <div className="flex items-center gap-2">
            <SortableKnob>
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>
            </SortableKnob>
            <div className="flex-1">{renderItem(item, index)}</div>
          </div>
        </SortableItem>
      ))}
    </EasySortableList>
  );
}

