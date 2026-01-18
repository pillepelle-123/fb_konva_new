import type { ReactNode } from 'react';
import { Button } from '../../../ui/primitives/button';
import { X, Check, BookCheck } from 'lucide-react';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Tooltip } from '../../../ui/composites/tooltip';

interface SelectorShellProps {
  headerContent?: ReactNode;
  listSection: ReactNode;
  className?: string;
  headerClassName?: string;
}

interface SelectorListSectionProps {
  title?: ReactNode;
  headerActions?: ReactNode;
  beforeList?: ReactNode;
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
  onCancel?: () => void;
  onApply?: () => void;
  canApply?: boolean;
  applyToEntireBook?: boolean;
  onApplyToEntireBookChange?: (checked: boolean) => void;
}

export function SelectorShell({
  headerContent,
  listSection,
  className = '',
  headerClassName = ''
}: SelectorShellProps) {
  const baseClasses = ['h-full', 'flex', 'flex-col', className].filter(Boolean).join(' ');
  const headerClasses = ['flex', 'flex-col', 'items-center', 'justify-between', 'p-4', 'border-b', 'border-gray-200', 'shrink-0', headerClassName].filter(Boolean).join(' ');

  return (
    <div className={baseClasses}>
      {headerContent && (
        <div className={headerClasses}>
          {headerContent}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col">
        {listSection}
      </div>
    </div>
  );
}

export function SelectorListSection({
  title,
  headerActions,
  beforeList,
  children,
  className = '',
  scrollClassName = '',
  onCancel,
  onApply,
  canApply = false,
  applyToEntireBook = false,
  onApplyToEntireBookChange
}: SelectorListSectionProps) {
  const containerClasses = ['flex-1', 'min-h-0', 'flex', 'flex-col', className].filter(Boolean).join(' ');
  const scrollClasses = ['space-y-2', 'flex-1', 'overflow-y-auto', scrollClassName].filter(Boolean).join(' ');

  // If onCancel/onApply are not provided, don't render buttons (for use without shell)
  const showButtons = onCancel !== undefined || onApply !== undefined;

  return (
    <div className={containerClasses}>
      {beforeList}
      <div className={scrollClasses}>
        {children}
      </div>
      {showButtons && (title || headerActions || onCancel || onApply) && (
        <div className="flex items-center justify-between mt-4 w-full shrink-0">
          {/* <div className="flex items-center gap-2">
            {title}
          </div> */}
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
              <Button
                variant="outline"
                size="xs"
                onClick={onCancel}
                className="gap-1 px-2"
                title="Cancel"
              >
                <X className="h-4 w-4" />
                <span className="text-xs">Cancel</span>
              </Button>
            )}
            {onApply && (
              <Button
                variant="default"
                size="xs"
                onClick={onApply}
                disabled={!canApply}
                className="gap-1  px-2"
                title={applyToEntireBook ? "Apply to all Pages" : "Apply"}
              >
                <Check className="h-4 w-4" />
                <span className="text-xs">{applyToEntireBook ? "Apply to all Pages" : "Apply"}</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}








