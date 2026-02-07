import type { ReactNode } from 'react';
import { Button } from '../../../ui/primitives/button';
import { X, Check, BookCheck } from 'lucide-react';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Tooltip } from '../../../ui/composites/tooltip';

interface SelectorBaseProps<T> {
  title: ReactNode;
  
  // Filter (optional)
  filterComponent?: ReactNode;
  
  // Liste
  items: T[];
  selectedItem: T | null;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  onItemSelect: (item: T) => void;
  getItemKey: (item: T, index: number) => string | number;
  
  // Selected/Preview Bereich
  renderSelectedPreview: (item: T | null) => ReactNode;
  
  // Shell-Props
  skipShell?: boolean;
  onCancel?: () => void;
  onApply?: () => void;
  canApply?: boolean;
  applyToEntireBook?: boolean;
  onApplyToEntireBookChange?: (checked: boolean) => void;
  headerActions?: ReactNode;
}

export function SelectorBase<T>({
  title,
  filterComponent,
  items,
  selectedItem,
  renderItem,
  onItemSelect,
  getItemKey,
  renderSelectedPreview,
  skipShell = false,
  onCancel,
  onApply,
  canApply = false,
  applyToEntireBook = false,
  onApplyToEntireBookChange,
  headerActions
}: SelectorBaseProps<T>) {
  const showButtons = onCancel !== undefined || onApply !== undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        {filterComponent}
        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {items.map((item, index) => (
            <div key={getItemKey(item, index)} onClick={() => onItemSelect(item)}>
              {renderItem(item, item === selectedItem)}
            </div>
          ))}
        </div>
        {renderSelectedPreview(selectedItem) && <div className="shrink-0">{renderSelectedPreview(selectedItem)}</div>}
        {showButtons && (
          <div className="flex items-center justify-between mt-4 w-full shrink-0">
            <div className="flex items-center gap-2">
              {headerActions}
              {onApplyToEntireBookChange && (
                <div className="flex items-center gap-1">
                  <Tooltip content="Apply to entire book" side="left">
                    <Checkbox
                      id="apply-to-entire-book"
                      checked={applyToEntireBook}
                      onCheckedChange={(checked) => onApplyToEntireBookChange(checked === true)}
                    />
                  </Tooltip>
                  <BookCheck className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button variant="outline" size="xs" onClick={onCancel} className="gap-1 px-2">
                  <X className="h-4 w-4" />
                  <span className="text-xs">Cancel</span>
                </Button>
              )}
              {onApply && (
                <Button variant="default" size="xs" onClick={onApply} disabled={!canApply} className="gap-1 px-2">
                  <Check className="h-4 w-4" />
                  <span className="text-xs">{applyToEntireBook ? "Apply to all Pages" : "Apply"}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
