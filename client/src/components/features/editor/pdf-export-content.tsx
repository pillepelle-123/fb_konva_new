import { useState } from 'react';
import { QualitySelector } from '../../shared/forms/quality-selector';
import { PageRangeSelector } from '../../shared/forms/page-range-selector';
import { ExportProgress } from './export-progress';

interface PDFExportContentProps {
  quality: 'preview' | 'medium' | 'printing';
  setQuality: (value: 'preview' | 'medium' | 'printing') => void;
  pageRange: 'all' | 'range' | 'current';
  setPageRange: (value: 'all' | 'range' | 'current') => void;
  startPage: number;
  setStartPage: (value: number) => void;
  endPage: number;
  setEndPage: (value: number) => void;
  maxPages: number;
  userRole?: 'author' | 'publisher' | null;
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
  isExporting = false,
  progress = 0
}: PDFExportContentProps) {
  return (
    <div className="p-1">
      <QualitySelector value={quality} onChange={setQuality} userRole={userRole} />
      
      <PageRangeSelector
        pageRange={pageRange}
        startPage={startPage}
        endPage={endPage}
        maxPages={maxPages}
        onPageRangeChange={setPageRange}
        onStartPageChange={setStartPage}
        onEndPageChange={setEndPage}
      />
      
      {isExporting && <ExportProgress progress={progress} />}
    </div>
  );
}


