import { useState } from 'react';
import { useEditor } from '../../context/editor-context';
import { exportBookToPDF, type PDFExportOptions } from '../../utils/pdf-export';
import { ModalOverlay, ModalContainer, ModalHeader, ModalActions, ModalButton } from '../ui';
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
      await exportBookToPDF(state.currentBook, options, setProgress, controller.signal);
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
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>Export to PDF</ModalHeader>
        
        <QualitySelector value={quality} onChange={setQuality} />
        
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
        
        <ModalActions>
          <ModalButton onClick={isExporting ? handleCancel : onClose}>
            Cancel
          </ModalButton>
          <ModalButton 
            onClick={handleExport} 
            disabled={isExporting} 
            variant="primary"
          >
            {isExporting ? 'Exporting...' : 'Print PDF'}
          </ModalButton>
        </ModalActions>
      </ModalContainer>
    </ModalOverlay>
  );
}