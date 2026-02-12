import { PageExplorer, type PageItem } from '../../editor/editor-bar/page-explorer';

interface PagesAssignmentsTabProps {
  pages?: PageItem[];
  pageAssignments?: Record<number, { id: number; name: string; email: string }>;
  onPageOrderChange?: (newPageOrder: number[]) => void;
}

export function PagesAssignmentsTab({
  pages = [],
  pageAssignments = {},
  onPageOrderChange,
}: PagesAssignmentsTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">Alle Seiten des Buches</p>
      {pages.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">Keine Seiten vorhanden.</p>
      ) : (
        <PageExplorer
          pages={pages}
          pageAssignments={pageAssignments}
          onPageOrderChange={onPageOrderChange}
        />
      )}
    </div>
  );
}
