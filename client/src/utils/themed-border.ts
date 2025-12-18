import React from 'react';
import { Path } from 'react-konva';
import Konva from 'konva';
import { getThemeRenderer, type Theme } from './themes-client';
import type { CanvasElement } from '../context/editor-context';
import { createThemedBorderConfig } from '../../../shared/utils/themed-border-core';
import { FEATURE_FLAGS } from './feature-flags';

export interface ThemedBorderConfig {
  // Standard-Einstellungen (für alle Themes)
  width: number;
  color: string;
  opacity?: number;
  cornerRadius?: number;
  
  // Pfad-Definition (für Rechtecke, Kreise, Linien, etc.)
  path: {
    type: 'rect' | 'circle' | 'line' | 'custom';
    // Für rect:
    x?: number;
    y?: number;
    width: number;
    height: number;
    // Für circle:
    centerX?: number;
    centerY?: number;
    radius?: number;
    // Für custom:
    pathData?: string;
  };
  
  // Theme-Einstellungen
  theme: Theme;
  themeSettings?: {
    // Candy-spezifisch
    candyRandomness?: boolean;
    candyIntensity?: 'weak' | 'middle' | 'strong';
    candySpacingMultiplier?: number;
    candyHoled?: boolean;
    
    // Rough-spezifisch
    roughness?: number;
    
    // Allgemein
    seed?: number;
  };
  
  // Rendering-Optionen
  zoom?: number;
  strokeScaleEnabled?: boolean;
  listening?: boolean;
  key?: string; // Für React key prop
}

/**
 * Rendert einen themed Border entlang eines Pfades.
 * Unterstützt alle Themes und kann mehrere Formen entlang des Pfades rendern.
 * 
 * Verwendung:
 * - Borders für Textboxen (QnA, Free Text)
 * - Frames für Bilder
 * - Borders für Shapes
 * - Ruled Lines (als einzelne Linien)
 */
export function renderThemedBorder(config: ThemedBorderConfig): React.ReactElement | null {
  const {
    width,
    color,
    opacity = 1,
    path,
    theme,
    themeSettings = {},
    zoom = 1,
    strokeScaleEnabled = true,
    listening = false,
    key
  } = config;
  
  // Use shared core logic
  const borderConfig = createThemedBorderConfig({
    width,
    color,
    opacity,
    cornerRadius: config.cornerRadius || 0,
    path,
    theme,
    themeSettings,
    zoom,
    getThemeRenderer
  });
  
  if (!borderConfig) return null;
  
  const { pathData, strokeProps, pathOffsetX, pathOffsetY } = borderConfig;
  
  return React.createElement(Path, {
    key,
    data: pathData,
    // Für Linien Offset berücksichtigen, damit die Theme-Pfade an der korrekten Position landen
    x: pathOffsetX,
    y: pathOffsetY,
    stroke: strokeProps.stroke || color,
    strokeWidth: strokeProps.strokeWidth || width,
    fill: strokeProps.fill || 'transparent',
    opacity: opacity * (strokeProps.opacity || 1),
    shadowColor: strokeProps.shadowColor,
    shadowBlur: strokeProps.shadowBlur,
    shadowOpacity: strokeProps.shadowOpacity,
    shadowOffsetX: strokeProps.shadowOffsetX,
    shadowOffsetY: strokeProps.shadowOffsetY,
    strokeDasharray: strokeProps.strokeDasharray,
    lineCap: (strokeProps.lineCap as 'butt' | 'round' | 'square' | undefined) || 'round',
    lineJoin: (strokeProps.lineJoin as 'miter' | 'round' | 'bevel' | undefined) || 'round',
    strokeScaleEnabled: strokeScaleEnabled,
    listening: listening
  });
}

/**
 * Helper: Erstellt eine Rechteck-Pfad-Konfiguration
 */
export function createRectPath(
  x: number,
  y: number,
  width: number,
  height: number
): ThemedBorderConfig['path'] {
  return {
    type: 'rect',
    x,
    y,
    width,
    height
  };
}

/**
 * Helper: Erstellt eine Kreis-Pfad-Konfiguration
 */
export function createCirclePath(
  centerX: number,
  centerY: number,
  radius: number
): ThemedBorderConfig['path'] {
  return {
    type: 'circle',
    centerX,
    centerY,
    radius,
    width: radius * 2,
    height: radius * 2
  };
}

/**
 * Helper: Erstellt eine Linien-Pfad-Konfiguration
 */
export function createLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ThemedBorderConfig['path'] {
  return {
    type: 'line',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

/**
 * Server-seitige Version von renderThemedBorder
 * Gibt native Konva-Objekte statt React-Komponenten zurück
 * Wird im PDF-Renderer verwendet (läuft im Browser via Puppeteer)
 * 
 * @param config - ThemedBorderConfig (ohne key, da nicht für React)
 * @returns Konva.Path | Konva.Line | null
 */
export function renderThemedBorderKonva(config: Omit<ThemedBorderConfig, 'key'>): Konva.Path | Konva.Line | null {
  const {
    width,
    color,
    opacity = 1,
    path,
    theme,
    themeSettings = {},
    zoom = 1,
    strokeScaleEnabled = true,
    listening = false
  } = config;
  
  // Use shared core logic
  const borderConfig = createThemedBorderConfig({
    width,
    color,
    opacity,
    cornerRadius: config.cornerRadius || 0,
    path,
    theme,
    themeSettings,
    zoom,
    getThemeRenderer
  });
  
  if (!borderConfig) return null;
  
  const { pathData, strokeProps, pathOffsetX, pathOffsetY } = borderConfig;
  
  // Create Konva.Path with all properties
  const konvaPath = new Konva.Path({
    data: pathData,
    // Für Linien Offset berücksichtigen, damit die Theme-Pfade an der korrekten Position landen
    x: pathOffsetX,
    y: pathOffsetY,
    stroke: strokeProps.stroke || color,
    strokeWidth: strokeProps.strokeWidth || width,
    fill: strokeProps.fill || 'transparent',
    opacity: opacity * (strokeProps.opacity || 1),
    shadowColor: strokeProps.shadowColor,
    shadowBlur: strokeProps.shadowBlur,
    shadowOpacity: strokeProps.shadowOpacity,
    shadowOffsetX: strokeProps.shadowOffsetX,
    shadowOffsetY: strokeProps.shadowOffsetY,
    strokeDasharray: strokeProps.strokeDasharray,
    lineCap: (strokeProps.lineCap as 'butt' | 'round' | 'square' | undefined) || 'round',
    lineJoin: (strokeProps.lineJoin as 'miter' | 'round' | 'bevel' | undefined) || 'round',
    strokeScaleEnabled: strokeScaleEnabled,
    listening: listening
  });
  
  return konvaPath;
}

/**
 * Wrapper function with feature flag and fallback support
 * Used in PDF renderer to safely migrate to centralized border rendering
 * 
 * @param config - ThemedBorderConfig (ohne key)
 * @param fallbackFn - Optional fallback function if feature flag is off or error occurs
 * @returns Konva.Path | Konva.Line | null
 */
export function renderThemedBorderKonvaWithFallback(
  config: Omit<ThemedBorderConfig, 'key'>,
  fallbackFn?: () => Konva.Path | Konva.Line | null
): Konva.Path | Konva.Line | null {
  // Check feature flag
  if (!FEATURE_FLAGS.USE_CENTRALIZED_BORDER_RENDERING) {
    // Use fallback if provided
    if (fallbackFn) {
      return fallbackFn();
    }
    // Otherwise return null (should not happen in practice)
    return null;
  }
  
  // Try centralized rendering
  try {
    return renderThemedBorderKonva(config);
  } catch (error) {
    console.warn('[renderThemedBorderKonvaWithFallback] Error in centralized rendering, using fallback:', error);
    // Use fallback if error occurs
    if (fallbackFn) {
      return fallbackFn();
    }
    return null;
  }
}

