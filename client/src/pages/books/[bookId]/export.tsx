import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { PDFExportContent } from '../../../components/features/editor/pdf-export-content';
import { Button } from '../../../components/ui/primitives/button';
import { Card, CardContent } from '../../../components/ui/composites/card';
import { Badge } from '../../../components/ui/composites/badge';
import { Download, Trash2, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PDFExport {
  id: number;
  bookId: number;
  userId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  quality: 'preview' | 'medium' | 'printing';
  pageRange: 'all' | 'range' | 'current';
  startPage?: number;
  endPage?: number;
  fileSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export default function BookExportPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [book, setBook] = useState<{ name: string; pages: any[]; userRole?: 'author' | 'publisher' | null } | null>(null);
  const [exports, setExports] = useState<PDFExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [quality, setQuality] = useState<'preview' | 'medium' | 'printing'>('medium');
  const [pageRange, setPageRange] = useState<'all' | 'range' | 'current'>('all');
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (bookId) {
      loadBook();
      loadExports();
      
      // Poll for status updates
      const interval = setInterval(() => {
        const hasPendingOrProcessing = exports.some(exp => exp.status === 'pending' || exp.status === 'processing');
        if (hasPendingOrProcessing) {
          loadExports();
        }
      }, 2000);

      return () => clearInterval(interval);
    }
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
  }, [exports, bookId]);

  const loadBook = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const bookData = await response.json();
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
          bookId: parseInt(bookId),
          quality,
          pageRange,
          startPage: pageRange === 'range' ? startPage : undefined,
          endPage: pageRange === 'range' ? endPage : undefined,
          currentPageIndex: pageRange === 'current' ? 0 : undefined
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

  const getStatusBadge = (status: PDFExport['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
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

  if (loading || !book) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/books/${bookId}/manager`)} className="mb-4">
          ← Back to Book Manager
        </Button>
        <h1 className="text-3xl font-bold">PDF Exports</h1>
        <p className="text-muted-foreground mt-2">Book: {book.name}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Export</h2>
          <PDFExportContent
            quality={quality}
            setQuality={setQuality}
            pageRange={pageRange}
            setPageRange={setPageRange}
            startPage={startPage}
            setStartPage={setStartPage}
            endPage={endPage}
            setEndPage={setEndPage}
            maxPages={book.pages?.length || 1}
            userRole={book.userRole}
            isExporting={isCreating}
          />
          <div className="mt-4">
            <Button onClick={handleCreateExport} disabled={isCreating} variant="default">
              {isCreating ? 'Creating...' : 'Create PDF Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Export History</h2>
          {exports.length === 0 ? (
            <p className="text-muted-foreground">No exports yet. Create your first export above.</p>
          ) : (
            <div className="space-y-4">
              {exports.map((exp) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}


