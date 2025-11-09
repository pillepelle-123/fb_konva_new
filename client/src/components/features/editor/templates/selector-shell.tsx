import { ReactNode } from 'react';

interface SelectorShellProps {
  headerContent?: ReactNode;
  listSection: ReactNode;
  previewSection?: ReactNode;
  previewPosition?: 'top' | 'bottom' | 'right';
  className?: string;
  headerClassName?: string;
  sidePreviewWrapperClassName?: string;
}

interface SelectorListSectionProps {
  title?: ReactNode;
  headerActions?: ReactNode;
  beforeList?: ReactNode;
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
}

export function SelectorShell({
  headerContent,
  listSection,
  previewSection,
  previewPosition = 'bottom',
  className = '',
  headerClassName = '',
  sidePreviewWrapperClassName = ''
}: SelectorShellProps) {
  const baseClasses = ['h-full', 'flex', 'flex-col', className].filter(Boolean).join(' ');
  const headerClasses = ['flex', 'flex-col', 'items-center', 'justify-between', 'p-4', 'border-b', 'border-gray-200', 'shrink-0', headerClassName].filter(Boolean).join(' ');

  if (previewSection && previewPosition === 'right') {
    const sidePreviewClasses = ['w-1/2', 'border-l', 'border-gray-200', 'flex', 'flex-col', 'min-h-0', 'overflow-hidden', sidePreviewWrapperClassName].filter(Boolean).join(' ');

    return (
      <div className={baseClasses}>
        {headerContent && (
          <div className={headerClasses}>
            {headerContent}
          </div>
        )}
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {listSection}
          <div className={sidePreviewClasses}>
            {previewSection}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {headerContent && (
        <div className={headerClasses}>
          {headerContent}
        </div>
      )}
      <div className="flex-1 min-h-0 flex flex-col">
        {previewSection && previewPosition === 'top' ? (
          <>
            {previewSection}
            {listSection}
          </>
        ) : (
          <>
            {listSection}
            {previewSection}
          </>
        )}
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
  scrollClassName = ''
}: SelectorListSectionProps) {
  const containerClasses = ['p-2', 'flex-1', 'min-h-0', 'flex', 'flex-col', className].filter(Boolean).join(' ');
  const scrollClasses = ['space-y-2', 'flex-1', 'overflow-y-auto', scrollClassName].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {(title || headerActions) && (
        <div className="flex items-center justify-between mb-3 w-full">
          <div className="flex items-center gap-2">
            {title}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>
      )}
      {beforeList}
      <div className={scrollClasses}>
        {children}
      </div>
    </div>
  );
}







