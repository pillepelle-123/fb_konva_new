import { useState } from 'react';
import { useEditor } from '../../context/editor-context';
import { exportBookToPDF, type PDFExportOptions } from '../../utils/pdf-export';
import { Modal } from '../ui/overlays/modal';
import { Button } from '../ui/primitives/button';
import { QualitySelector } from '../cards/quality-selector';
import { PageRangeSelector } from '../cards/page-range-selector';
import { ExportProgress } from '../cards/export-progress';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFExportModal({ isOpen, onClose }: PDFExportModalProps) {
  const { state } = useEditor();
  const [quality, setQuality] = useState<'preview' | 'medium' | 'printing'>('medium');
  const [pageRange, setPageRange] = useState<'all' | 'range'>('all');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(state.currentBook?.pages.length || 1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportController, setExportController] = useState<AbortController | null>(null);

  if (!isOpen || !state.currentBook) return null;

  const handleExport = async () => {
    const controller = new AbortController();
    setExportController(controller);
    setIsExporting(true);
    setProgress(0);

    const options: PDFExportOptions = {
      quality,
      pageRange,
      startPage: pageRange === 'range' ? startPage : undefined,
      endPage: pageRange === 'range' ? endPage : undefined,
    };

    try {
      // Fix TypeScript error by ensuring state.currentBook is not null
      await exportBookToPDF(state.currentBook, options, setProgress, controller.signal, state.userRole);
      onClose();
    } catch (error) {
      // Fix TypeScript error by checking error type properly
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('PDF export failed:', error);
      }
    } finally {
      setIsExporting(false);
      setProgress(0);
      setExportController(null);
    }
  };

  const handleCancel = () => {
    if (exportController) {
      exportController.abort();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExporting ? handleCancel : onClose}
      title="Export to PDF"
      actions={
        <>
          <Button onClick={isExporting ? handleCancel : onClose} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting} 
            variant="default"
          >
            {isExporting ? 'Exporting...' : 'Print PDF'}
          </Button>
        </>
      }
    >
      <QualitySelector value={quality} onChange={setQuality} userRole={state.userRole} />
      
      <PageRangeSelector
        pageRange={pageRange}
        startPage={startPage}
        endPage={endPage}
        maxPages={state.currentBook.pages.length}
        onPageRangeChange={setPageRange}
        onStartPageChange={setStartPage}
        onEndPageChange={setEndPage}
      />
      
      {isExporting && <ExportProgress progress={progress} />}
    </Modal>
  );
}