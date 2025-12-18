import React from 'react';
import { Path } from 'react-konva';
import { getThemeRenderer, type Theme } from './themes-client';
import type { CanvasElement } from '../context/editor-context';

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
    cornerRadius = 0,
    path,
    theme,
    themeSettings = {},
    zoom = 1,
    strokeScaleEnabled = true,
    listening = false,
    key
  } = config;
  
  // Bestimme Element-Typ basierend auf Pfad-Typ
  let elementType: CanvasElement['type'] = 'rect';
  let elementWidth = path.width;
  let elementHeight = path.height;
  let elementX = path.x || 0;
  let elementY = path.y || 0;

  // Für Linien: Pfad relativ zu (0,0) generieren und Offset separat als x/y am Path setzen
  // Dadurch können Theme-Algorithmen weiterhin von (0,0) ausgehen, während die Linie
  // in der Textbox/QnA-Box an der korrekten Position erscheint.
  let pathOffsetX = 0;
  let pathOffsetY = 0;
  
  if (path.type === 'circle') {
    elementType = 'circle';
    // Für Kreise: width und height sind diameter
    elementWidth = (path.radius || path.width / 2) * 2;
    elementHeight = (path.radius || path.height / 2) * 2;
    elementX = (path.centerX || 0) - elementWidth / 2;
    elementY = (path.centerY || 0) - elementHeight / 2;
  } else if (path.type === 'line') {
    elementType = 'line';
    // Für Linien: width und height sind die Delta-Werte
    // Die tatsächliche Linie geht von (x, y) nach (x + width, y + height)
    // Theme-Engine arbeitet relativ zu (0,0), daher merken wir uns den Offset separat.
    pathOffsetX = path.x || 0;
    pathOffsetY = path.y || 0;
  } else if (path.type === 'custom' && path.pathData) {
    // Für custom paths, verwende rect als Basis (wird durch pathData überschrieben)
    elementType = 'rect';
  }
  
  // Erstelle temporäres Element für Theme-Renderer
  const tempElement: CanvasElement = {
    type: elementType,
    id: `border-${themeSettings.seed || 1}`,
    x: elementX,
    y: elementY,
    width: elementWidth,
    height: elementHeight,
    cornerRadius: cornerRadius,
    stroke: color,
    strokeWidth: width,
    borderWidth: width,
    fill: 'transparent',
    theme: theme,
    roughness: themeSettings.roughness || (theme === 'rough' ? 8 : 1),
    // Theme-spezifische Einstellungen
    candyRandomness: themeSettings.candyRandomness,
    candyIntensity: themeSettings.candyIntensity,
    candySpacingMultiplier: themeSettings.candySpacingMultiplier,
    candyHoled: themeSettings.candyHoled,
    ...themeSettings
  } as CanvasElement;
  
  const themeRenderer = getThemeRenderer(theme);
  const pathData = themeRenderer.generatePath(tempElement, zoom);
  const strokeProps = themeRenderer.getStrokeProps(tempElement, zoom);
  
  if (!pathData) return null;
  
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

