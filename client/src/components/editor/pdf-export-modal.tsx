import { useState } from 'react';
import { useEditor } from '../../context/editor-context';
import { exportBookToPDF, type PDFExportOptions } from '../../utils/pdf-export';

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        minWidth: '400px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
          Export to PDF
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            PDF Quality:
          </label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as any)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          >
            <option value="preview">Preview</option>
            <option value="medium">Medium</option>
            <option value="printing">For Printing</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Page Range:
          </label>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <input
                type="radio"
                value="all"
                checked={pageRange === 'all'}
                onChange={(e) => setPageRange(e.target.value as any)}
                style={{ marginRight: '8px' }}
              />
              Print all pages
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="radio"
                value="range"
                checked={pageRange === 'range'}
                onChange={(e) => setPageRange(e.target.value as any)}
                style={{ marginRight: '8px' }}
              />
              Pages
            </label>
          </div>
          {pageRange === 'range' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '24px' }}>
              <input
                type="number"
                min="1"
                max={state.currentBook.pages.length}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value))}
                style={{
                  width: '60px',
                  padding: '4px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
              <span>to</span>
              <input
                type="number"
                min="1"
                max={state.currentBook.pages.length}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value))}
                style={{
                  width: '60px',
                  padding: '4px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
            </div>
          )}
        </div>

        {isExporting && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '4px', fontSize: '14px' }}>
              Exporting... {Math.round(progress)}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#2563eb',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={isExporting ? handleCancel : onClose}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#2563eb',
              color: 'white',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.5 : 1
            }}
          >
            {isExporting ? 'Exporting...' : 'Print PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}