import { useState } from 'react';
import { useEditor } from '../../../context/editor-context';
import { exportBookToPDF, type PDFExportOptions } from '../../../utils/pdf-export';
import { Modal } from '../../ui/overlays/modal';
import { Button } from '../../ui/primitives/button';
import { PDFExportContent } from './pdf-export-content';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PDFExportModal({ isOpen, onClose }: PDFExportModalProps) {
  const { state } = useEditor();
  const [quality, setQuality] = useState<'preview' | 'medium' | 'printing' | 'excellent'>('medium');
  const [pageRange, setPageRange] = useState<'all' | 'range' | 'current'>('all');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(state.currentBook?.pages.length || 1);
  const [useCMYK, setUseCMYK] = useState(false);
  const [iccProfile, setIccProfile] = useState<'iso-coated-v2' | 'fogra39'>('iso-coated-v2');
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
      currentPageIndex: pageRange === 'current' ? state.activePageIndex : undefined,
      useCMYK,
      iccProfile: useCMYK ? iccProfile : undefined,
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
      closeOnBackdrop={false}
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
      <PDFExportContent
        quality={quality}
        setQuality={setQuality}
        pageRange={pageRange}
        setPageRange={setPageRange}
        startPage={startPage}
        setStartPage={setStartPage}
        endPage={endPage}
        setEndPage={setEndPage}
        maxPages={state.currentBook.pages.length}
        userRole={state.userRole}
        userAdminRole={state.user?.role || null}
        isExporting={isExporting}
        progress={progress}
        useCMYK={useCMYK}
        setUseCMYK={setUseCMYK}
        iccProfile={iccProfile}
        setIccProfile={setIccProfile}
      />
    </Modal>
  );
}