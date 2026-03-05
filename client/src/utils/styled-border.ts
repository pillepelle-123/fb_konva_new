import React from 'react';
import { Path, Group } from 'react-konva';
import Konva from 'konva';
import { getStyleRenderer, type Style } from './styles-client';
import type { CanvasElement } from '../context/editor-context';
import { createStyledBorderConfig } from '../../../shared/utils/styled-border-core';
import { FEATURE_FLAGS } from './feature-flags';

export interface StyledBorderConfig {
  // Standard-Einstellungen (für alle Styles)
  width: number;
  color: string;
  opacity?: number;
  cornerRadius?: number;
  
  // Pfad-Definition (für Rechtecke, Kreise, Linien, etc.)
  path: {
    type: 'rect' | 'circle' | 'line' | 'custom';
    x?: number;
    y?: number;
    width: number;
    height: number;
    centerX?: number;
    centerY?: number;
    radius?: number;
    pathData?: string;
  };
  
  // Style-Einstellungen
  style: Style;
  styleSettings?: {
    candyRandomness?: boolean;
    candyIntensity?: 'weak' | 'middle' | 'strong';
    candySpacingMultiplier?: number;
    candyHoled?: boolean;
    roughness?: number;
    seed?: number;
  };
  
  zoom?: number;
  strokeScaleEnabled?: boolean;
  listening?: boolean;
  key?: string;
}

/**
 * Rendert einen styled Border entlang eines Pfades.
 * Unterstützt alle Styles und kann mehrere Formen entlang des Pfades rendern.
 */
export function renderStyledBorder(config: StyledBorderConfig): React.ReactElement | null {
  const {
    width,
    color,
    opacity = 1,
    path,
    style,
    styleSettings = {},
    zoom = 1,
    strokeScaleEnabled = true,
    listening = false,
    key
  } = config;
  
  const borderConfig = createStyledBorderConfig({
    width,
    color,
    opacity,
    cornerRadius: config.cornerRadius || 0,
    path,
    style,
    styleSettings,
    zoom,
    getStyleRenderer
  });
  
  if (!borderConfig) return null;
  
  const { pathData, strokeProps, pathOffsetX, pathOffsetY } = borderConfig;
  
  const useGlowLayers = strokeProps.useGlowLayers === true;
  const glowMultiplier = strokeProps.glowLayerWidthMultiplier ?? 2.5;
  const glowOpacity = strokeProps.glowLayerOpacity ?? 0.25;
  
  const basePathProps = {
    data: pathData,
    x: pathOffsetX,
    y: pathOffsetY,
    stroke: strokeProps.stroke || color,
    fill: strokeProps.fill || 'transparent',
    dash: strokeProps.dash || strokeProps.strokeDasharray,
    lineCap: (strokeProps.lineCap as 'butt' | 'round' | 'square' | undefined) || 'round',
    lineJoin: (strokeProps.lineJoin as 'miter' | 'round' | 'bevel' | undefined) || 'round',
    strokeScaleEnabled: strokeScaleEnabled,
    listening: listening
  };
  
  if (useGlowLayers) {
    const coreStrokeWidth = strokeProps.strokeWidth || width;
    const glowStrokeWidth = coreStrokeWidth * glowMultiplier;
    return React.createElement(Group, { key, listening: false }, [
      React.createElement(Path, {
        key: 'glow',
        ...basePathProps,
        strokeWidth: glowStrokeWidth,
        opacity: opacity * glowOpacity,
        perfectDrawEnabled: false
      }),
      React.createElement(Path, {
        key: 'core',
        ...basePathProps,
        strokeWidth: coreStrokeWidth,
        opacity: opacity * (strokeProps.opacity || 1),
        perfectDrawEnabled: false
      })
    ]);
  }
  
  return React.createElement(Path, {
    key,
    ...basePathProps,
    strokeWidth: strokeProps.strokeWidth || width,
    opacity: opacity * (strokeProps.opacity || 1),
    shadowColor: strokeProps.shadowColor,
    shadowBlur: strokeProps.shadowBlur,
    shadowOpacity: strokeProps.shadowOpacity,
    shadowOffsetX: strokeProps.shadowOffsetX,
    shadowOffsetY: strokeProps.shadowOffsetY,
    perfectDrawEnabled: false
  });
}

export function createRectPath(
  x: number,
  y: number,
  width: number,
  height: number
): StyledBorderConfig['path'] {
  return { type: 'rect', x, y, width, height };
}

export function createCirclePath(
  centerX: number,
  centerY: number,
  radius: number
): StyledBorderConfig['path'] {
  return {
    type: 'circle',
    centerX,
    centerY,
    radius,
    width: radius * 2,
    height: radius * 2
  };
}

export function createLinePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): StyledBorderConfig['path'] {
  return {
    type: 'line',
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

export function renderStyledBorderKonva(config: Omit<StyledBorderConfig, 'key'>): Konva.Path | Konva.Line | Konva.Group | null {
  const {
    width,
    color,
    opacity = 1,
    path,
    style,
    styleSettings = {},
    zoom = 1,
    strokeScaleEnabled = true,
    listening = false
  } = config;
  
  const borderConfig = createStyledBorderConfig({
    width,
    color,
    opacity,
    cornerRadius: config.cornerRadius || 0,
    path,
    style,
    styleSettings,
    zoom,
    getStyleRenderer
  });
  
  if (!borderConfig) return null;
  
  const { pathData, strokeProps, pathOffsetX, pathOffsetY } = borderConfig;
  
  const basePathAttrs = {
    data: pathData,
    x: pathOffsetX,
    y: pathOffsetY,
    stroke: strokeProps.stroke || color,
    fill: strokeProps.fill || 'transparent',
    dash: strokeProps.dash || strokeProps.strokeDasharray,
    lineCap: (strokeProps.lineCap as 'butt' | 'round' | 'square' | undefined) || 'round',
    lineJoin: (strokeProps.lineJoin as 'miter' | 'round' | 'bevel' | undefined) || 'round',
    strokeScaleEnabled: strokeScaleEnabled,
    listening: listening
  };
  
  const useGlowLayers = strokeProps.useGlowLayers === true;
  const glowMultiplier = strokeProps.glowLayerWidthMultiplier ?? 2.5;
  const glowOpacity = strokeProps.glowLayerOpacity ?? 0.25;
  
  if (useGlowLayers) {
    const coreStrokeWidth = strokeProps.strokeWidth || width;
    const glowStrokeWidth = coreStrokeWidth * glowMultiplier;
    const group = new Konva.Group({ listening: false });
    group.add(new Konva.Path({
      ...basePathAttrs,
      strokeWidth: glowStrokeWidth,
      opacity: opacity * glowOpacity
    }));
    group.add(new Konva.Path({
      ...basePathAttrs,
      strokeWidth: coreStrokeWidth,
      opacity: opacity * (strokeProps.opacity || 1)
    }));
    return group;
  }
  
  const konvaPath = new Konva.Path({
    ...basePathAttrs,
    strokeWidth: strokeProps.strokeWidth || width,
    opacity: opacity * (strokeProps.opacity || 1),
    shadowColor: strokeProps.shadowColor,
    shadowBlur: strokeProps.shadowBlur,
    shadowOpacity: strokeProps.shadowOpacity,
    shadowOffsetX: strokeProps.shadowOffsetX,
    shadowOffsetY: strokeProps.shadowOffsetY,
    listening: listening
  });

  return konvaPath;
}

export function renderStyledBorderKonvaWithFallback(
  config: Omit<StyledBorderConfig, 'key'>,
  fallbackFn?: () => Konva.Path | Konva.Line | Konva.Group | null
): Konva.Path | Konva.Line | Konva.Group | null {
  if (!FEATURE_FLAGS.USE_CENTRALIZED_BORDER_RENDERING) {
    if (fallbackFn) return fallbackFn();
    return null;
  }
  
  try {
    return renderStyledBorderKonva(config);
  } catch (error) {
    console.warn('[renderStyledBorderKonvaWithFallback] Error in centralized rendering, using fallback:', error);
    if (fallbackFn) return fallbackFn();
    return null;
  }
}
