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

import { PDFRendererApp } from './pdf-renderer-app';
import { PDFRenderer } from './pdf-renderer';
import { PDFExportAuthProvider } from './pdf-export-auth-provider';
import { PDFExportEditorProvider } from './pdf-export-editor-provider';

export { PDFRendererApp } from './pdf-renderer-app';
export { PDFRenderer } from './pdf-renderer';
export { PDFExportAuthProvider } from './pdf-export-auth-provider';
export { PDFExportEditorProvider } from './pdf-export-editor-provider';

export type { Page, Book } from '../../context/editor-context.tsx';

// Make PDFRenderer available globally for Puppeteer
// Vite's IIFE build should set window.PDFRenderer automatically, but we ensure it's set explicitly
if (typeof window !== 'undefined') {
  (window as any).PDFRenderer = {
    PDFRendererApp,
    PDFRenderer,
    PDFExportAuthProvider,
    PDFExportEditorProvider
  };
  (window as any).pdfRendererScriptLoaded = true;
}

