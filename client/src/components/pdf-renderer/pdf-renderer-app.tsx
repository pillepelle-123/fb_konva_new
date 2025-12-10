import React, { useEffect, useState } from 'react';
import type { Page, Book } from '../../context/editor-context.tsx';
import { PDFExportAuthProvider } from './pdf-export-auth-provider';
import { PDFExportEditorProvider } from './pdf-export-editor-provider';
import { PDFRenderer } from './pdf-renderer';
import { loadBackgroundImageRegistry } from '../../data/templates/background-images';

interface PDFRendererAppProps {
  pageData: {
    page: Page;
    book: Book;
    canvasWidth: number;
    canvasHeight: number;
    scale?: number;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  token?: string | null;
  onRenderComplete?: (imageDataUrl: string) => void;
}

// Error Boundary Component
class PDFRendererErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PDFRendererErrorBoundary] Error caught:', error);
    console.error('[PDFRendererErrorBoundary] Error info:', errorInfo);
    console.error('[PDFRendererErrorBoundary] Component stack:', errorInfo.componentStack);
    // Store error globally for debugging
    if (typeof window !== 'undefined') {
      (window as any).renderError = error.message || String(error);
      (window as any).reactError = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      };
    }
  }

  render() {
    if (this.state.hasError) {
      console.error('[PDFRendererErrorBoundary] Rendering error fallback');
      return null; // Return null to avoid breaking the render
    }

    return this.props.children;
  }
}

export function PDFRendererApp({
  pageData,
  user = null,
  token = null,
  onRenderComplete,
}: PDFRendererAppProps) {
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadBackgroundImageRegistry();
      } catch (err) {
        console.error('[PDFRendererApp] Failed to load background images registry:', err);
      } finally {
        if (!cancelled) setAssetsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!assetsReady) {
    return null;
  }

  return (
    <PDFRendererErrorBoundary>
      <PDFExportAuthProvider user={user} token={token}>
        <PDFExportEditorProvider bookData={pageData.book}>
          <PDFRenderer
            page={pageData.page}
            bookData={pageData.book}
            width={pageData.canvasWidth}
            height={pageData.canvasHeight}
            scale={pageData.scale}
          />
        </PDFExportEditorProvider>
      </PDFExportAuthProvider>
    </PDFRendererErrorBoundary>
  );
}

