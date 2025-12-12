import { QualitySelector } from '../../shared/forms/quality-selector';
import { PageRangeSelector } from '../../shared/forms/page-range-selector';
import { ExportProgress } from './export-progress';

interface PDFExportContentProps {
  quality: 'preview' | 'medium' | 'printing' | 'excellent';
  setQuality: (value: 'preview' | 'medium' | 'printing' | 'excellent') => void;
  pageRange: 'all' | 'range' | 'current';
  setPageRange: (value: 'all' | 'range' | 'current') => void;
  startPage: number;
  setStartPage: (value: number) => void;
  endPage: number;
  setEndPage: (value: number) => void;
  maxPages: number;
  userRole?: 'author' | 'publisher' | 'owner' | null; // book_friends.book_role
  userAdminRole?: string | null; // users.role
  isExporting?: boolean;
  progress?: number;
}

export function PDFExportContent({
  quality,
  setQuality,
  pageRange,
  setPageRange,
  startPage,
  setStartPage,
  endPage,
  setEndPage,
  maxPages,
  userRole,
  userAdminRole,
  isExporting = false,
  progress = 0
}: PDFExportContentProps) {
  return (
    <div className="p-1">
      <div className="flex gap-4 items-start">
        <div className="w-1/2">
          <QualitySelector value={quality} onChange={setQuality} userRole={userRole} userAdminRole={userAdminRole} />
        </div>
        
        <div className="w-1/2">
          <PageRangeSelector
            pageRange={pageRange}
            startPage={startPage}
            endPage={endPage}
            maxPages={maxPages}
            onPageRangeChange={setPageRange}
            onStartPageChange={setStartPage}
            onEndPageChange={setEndPage}
          />
        </div>
      </div>
      
      {isExporting && <ExportProgress progress={progress} />}
    </div>
  );
}


