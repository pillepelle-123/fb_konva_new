import React from 'react';

interface CanvasErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  CanvasErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CanvasErrorBoundary] Canvas error caught:', error?.message ?? String(error));
    if (error?.stack) console.error('[CanvasErrorBoundary] Stack:', error.stack);
    console.error('[CanvasErrorBoundary] Component stack:', errorInfo.componentStack);
    // Vollständiges Error-Objekt für Debugging (z.B. bei Konva/Stage-Fehlern)
    console.error('[CanvasErrorBoundary] Full error info:', {
      message: error?.message,
      name: error?.name,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded">
          <div className="text-center p-4 max-w-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Canvas Fehler</h3>
            <p className="text-gray-600 mb-2">
              Beim Laden der Canvas ist ein Fehler aufgetreten.
            </p>
            {err && (
              <pre className="text-left text-xs bg-gray-200 p-3 rounded mb-4 overflow-auto max-h-32">
                {err.message}
                {err.stack && `\n\n${err.stack}`}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;