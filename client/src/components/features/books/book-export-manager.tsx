import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/auth-context';
import { PDFExportContent } from '../editor/pdf-export-content';
import { Button } from '../../ui/primitives/button';
import { Card, CardContent } from '../../ui/composites/card';
import { Badge } from '../../ui/composites/badge';
import { Download, Trash2, Loader2, AlertCircle, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { exportBookToPDF, type PDFExportOptions } from '../../../utils/pdf-export';
import type { Book } from '../../../context/editor-context';

interface PDFExport {
  id: number;
  bookId: number;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  quality: 'preview' | 'medium' | 'printing' | 'excellent';
  pageRange: 'all' | 'range' | 'current';
  startPage?: number;
  endPage?: number;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

interface BookExportManagerProps {
  bookId: string | number;
  bookName?: string;
  maxPages?: number;
  userRole?: 'author' | 'publisher' | 'owner' | null;
  userAdminRole?: string | null;
  showHeader?: boolean;
  onBack?: () => void;
  currentPageIndex?: number; // Index der aktuellen Seite im Editor (0-basiert)
  book?: Book; // Vollständiges Book-Objekt für client-seitigen Export (optional)
}

export function BookExportManager({
  bookId,
  bookName,
  maxPages,
  userRole,
  userAdminRole,
  showHeader = true,
  onBack,
  currentPageIndex,
  book: bookProp
}: BookExportManagerProps) {
  const { token, user } = useAuth();
  const [book, setBook] = useState<{ name: string; pages: unknown[]; userRole?: 'author' | 'publisher' | 'owner' | { role: 'author' | 'publisher' | 'owner' } | null; userAdminRole?: string | null } | null>(null);
  const [exports, setExports] = useState<PDFExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<'preview' | 'medium' | 'printing' | 'excellent'>('medium');
  const [pageRange, setPageRange] = useState<'all' | 'range' | 'current'>('all');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [useCMYK, setUseCMYK] = useState(false);
  const [iccProfile, setIccProfile] = useState<'iso-coated-v2' | 'fogra39'>('iso-coated-v2');
  const [isCreating, setIsCreating] = useState(false);
  const [isClientExporting, setIsClientExporting] = useState(false);
  const [clientExportProgress, setClientExportProgress] = useState(0);
  const clientExportControllerRef = useRef<AbortController | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (bookId) {
      if (!bookName || !maxPages) {
        loadBook();
      }
      loadExports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  useEffect(() => {
    if (bookId) {
      const hasPendingOrProcessing = exports.some(exp => exp.status === 'pending' || exp.status === 'processing');
      if (hasPendingOrProcessing) {
        const interval = setInterval(() => {
          loadExports();
        }, 2000);
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exports, bookId]);

  // Reset to first page when exports change
  useEffect(() => {
    const totalPages = Math.ceil(exports.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exports.length, itemsPerPage]);

  const loadBook = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const bookData = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('[BookExportManager] Book data loaded:', {
            userAdminRole: bookData.userAdminRole,
            userRole: bookData.userRole,
            userFromAuth: user?.role
          });
        }
        setBook(bookData);
        setEndPage(bookData.pages?.length || 1);
      }
    } catch (error) {
      console.error('Error loading book:', error);
    }
  };

  const loadExports = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports/book/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const exportsData = await response.json();
        setExports(exportsData);
      }
    } catch (error) {
      console.error('Error loading exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExport = async () => {
    if (!bookId) return;
    
    setIsCreating(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookId: typeof bookId === 'string' ? parseInt(bookId) : bookId,
          quality,
          pageRange,
          startPage: pageRange === 'range' ? startPage : undefined,
          endPage: pageRange === 'range' ? endPage : undefined,
          currentPageIndex: pageRange === 'current' && currentPageIndex !== undefined ? currentPageIndex : undefined,
          useCMYK,
          iccProfile: useCMYK ? iccProfile : undefined
        })
      });

      if (response.ok) {
        toast.success('PDF export started');
        await loadExports();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to start PDF export');
      }
    } catch (error) {
      console.error('Error creating export:', error);
      toast.error('Failed to start PDF export');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (exportId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports/${exportId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${exportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleDelete = async (exportId: number) => {
    if (!confirm('Are you sure you want to delete this export?')) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports/${exportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Export deleted');
        await loadExports();
      } else {
        toast.error('Failed to delete export');
      }
    } catch (error) {
      console.error('Error deleting export:', error);
      toast.error('Failed to delete export');
    }
  };

  const handleClientExport = async () => {
    // Prüfe ob Book-Objekt verfügbar ist
    const bookForExport = bookProp;
    if (!bookForExport) {
      toast.error('Book data not available for client export');
      return;
    }

    const controller = new AbortController();
    clientExportControllerRef.current = controller;
    setIsClientExporting(true);
    setClientExportProgress(0);

    const options: PDFExportOptions = {
      quality,
      pageRange,
      startPage: pageRange === 'range' ? startPage : undefined,
      endPage: pageRange === 'range' ? endPage : undefined,
      currentPageIndex: pageRange === 'current' && currentPageIndex !== undefined ? currentPageIndex : undefined,
      useCMYK,
      iccProfile: useCMYK ? iccProfile : undefined,
    };

    try {
      // Convert 'owner' to 'publisher' for exportBookToPDF (which only accepts 'author' | 'publisher' | null)
      const exportUserRole = displayUserRole === 'owner' ? 'publisher' : (displayUserRole === 'author' || displayUserRole === 'publisher' ? displayUserRole : undefined);
      await exportBookToPDF(bookForExport, options, setClientExportProgress, controller.signal, exportUserRole);
      toast.success('PDF export completed');
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Client PDF export failed:', error);
        toast.error(error.message || 'Failed to export PDF');
      }
    } finally {
      setIsClientExporting(false);
      setClientExportProgress(0);
      clientExportControllerRef.current = null;
    }
  };

  const isAdmin = user?.role === 'admin';

  const getStatusBadge = (status: PDFExport['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="highlight" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
      case 'processing':
        return <Badge variant="default" className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
      case 'pending':
        return <Badge variant="default" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const displayBookName = bookName || book?.name || '';
  const displayMaxPages = maxPages || book?.pages?.length || 1;
  const displayUserRole: 'author' | 'publisher' | 'owner' | null = userRole !== undefined 
    ? (typeof userRole === 'object' && userRole !== null && 'role' in userRole ? (userRole as { role: 'author' | 'publisher' | 'owner' }).role : userRole)
    : (typeof book?.userRole === 'object' && book?.userRole !== null && 'role' in book.userRole ? (book.userRole as { role: 'author' | 'publisher' | 'owner' }).role : book?.userRole as 'author' | 'publisher' | 'owner' | null);
  const displayUserAdminRole = userAdminRole ?? book?.userAdminRole ?? user?.role ?? null;

  if (loading && !book && !bookName) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="mb-6">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="mb-4">
              ← Back
            </Button>
          )}
          <h1 className="text-3xl font-bold">PDF Exports</h1>
          {displayBookName && (
            <p className="text-muted-foreground mt-2">Book: {displayBookName}</p>
          )}
        </div>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          {/* <h2 className="text-xl font-semibold mb-4">Create New Export</h2> */}
          <PDFExportContent
            quality={quality}
            setQuality={setQuality}
            pageRange={pageRange}
            setPageRange={setPageRange}
            startPage={startPage}
            setStartPage={setStartPage}
            endPage={endPage}
            setEndPage={setEndPage}
            maxPages={displayMaxPages}
            userRole={displayUserRole}
            userAdminRole={displayUserAdminRole}
            isExporting={isCreating || isClientExporting}
            progress={clientExportProgress}
          useCMYK={useCMYK}
          setUseCMYK={setUseCMYK}
          iccProfile={iccProfile}
          setIccProfile={setIccProfile}
          />
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreateExport} disabled={isCreating || isClientExporting} variant="default">
              {isCreating ? 'Creating...' : 'Create PDF Export'}
            </Button>
            {isAdmin && bookProp && (
              <Button 
                onClick={handleClientExport} 
                disabled={isCreating || isClientExporting} 
                variant="outline"
              >
                {isClientExporting ? 'Exporting...' : 'Client PDF Export'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Export History</h2>
          {exports.length === 0 ? (
            <p className="text-muted-foreground">No exports yet. Create your first export above.</p>
          ) : (
            <>
              {/* Pagination Controls */}
              {exports.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Zeige</span>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>Einträge pro Seite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Seite {currentPage} von {Math.ceil(exports.length / itemsPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(exports.length / itemsPerPage)))}
                      disabled={currentPage >= Math.ceil(exports.length / itemsPerPage)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Export List */}
              <div className="space-y-4">
                {exports
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(exp.status)}
                          <span className="text-sm text-muted-foreground">
                            Quality: {exp.quality} • Range: {exp.pageRange}
                            {exp.pageRange === 'range' && exp.startPage && exp.endPage && ` (${exp.startPage}-${exp.endPage})`}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(exp.createdAt).toLocaleString()}
                          {exp.completedAt && ` • Completed: ${new Date(exp.completedAt).toLocaleString()}`}
                          {exp.fileSize && ` • Size: ${formatFileSize(exp.fileSize)}`}
                          {exp.errorMessage && (
                            <div className="mt-1 text-destructive text-xs">{exp.errorMessage}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {exp.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(exp.id)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(exp.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

