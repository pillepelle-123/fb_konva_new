import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

// Make React and ReactDOM globally available for Puppeteer
if (typeof window !== 'undefined') {
  (window as any).React = React;
  // Expose ReactDOM with createRoot from react-dom/client
  (window as any).ReactDOM = {
    ...ReactDOM,
    createRoot: createRoot,
  };
}

export { PDFRendererApp } from './pdf-renderer-app';
export { PDFRenderer } from './pdf-renderer';
export { PDFExportAuthProvider } from './pdf-export-auth-provider';
export { PDFExportEditorProvider } from './pdf-export-editor-provider';

export type { Page, Book } from '../../context/editor-context.tsx';

