/**
 * Shared Style Renderers Module
 * Centralizes all style rendering logic for borders, frames, and strokes
 * Provides unified API for rectangles, lines, circles, and polygons
 */

import type { Style } from '../types/style-types';

// Dynamic imports for both Node and browser environments
let stylesEngine: any;

if (typeof require !== 'undefined') {
  // CommonJS environment (Node.js)
  stylesEngine = require('./styles-engine');
}

// Types for style renderers
export interface StyleSettings {
  candyRandomness?: boolean;
  candyIntensity?: 'weak' | 'middle' | 'strong';
  candySpacingMultiplier?: number;
  candyHoled?: boolean;
  roughness?: number;
  seed?: number;
}

export interface RenderDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface CircleDimensions {
  centerX: number;
  centerY: number;
  radius: number;
}

export interface LineDimensions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolygonDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
  sides?: number; // For polygon
  polygonType?: 'triangle' | 'polygon'; // For specific shapes
}

export interface RenderOptions {
  strokeWidth: number;
  color: string;
  opacity?: number;
  style: Style;
  styleSettings?: StyleSettings;
  zoom?: number;
  elementId?: string;
  elementType?: 'textbox' | 'image' | 'shape';
}

export interface RenderResult {
  pathData: string;
  strokeProps: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    lineCap?: string;
    lineJoin?: string;
    dash?: number[];
    strokeDasharray?: number[];
    useGlowLayers?: boolean;
    glowLayerWidthMultiplier?: number;
    glowLayerOpacity?: number;
  };
  pathOffsetX?: number;
  pathOffsetY?: number;
}

/**
 * Resolves complete style settings for an element
 * Handles zoom, seed generation, and style-specific defaults
 */
export function resolveStyleSettings(
  elementId: string,
  style: Style,
  zoom: number,
  elementType: 'textbox' | 'image' | 'shape',
  customSettings?: StyleSettings
): { styleSettings: StyleSettings; effectiveZoom: number } {
  const settings: StyleSettings = { ...customSettings };

  // Seed generation strategy
  if (settings.seed === undefined) {
    if (elementType === 'textbox' || elementType === 'image') {
      // Textbox and image borders use consistent seed for predictable appearance
      settings.seed = 1;
    } else {
      // Shapes use ID-derived seed for variation
      const idMatch = elementId.match(/\d+/);
      settings.seed = idMatch ? parseInt(idMatch[0], 10) : 1;
    }
  }

  // Zoom handling: textbox/image borders ignore zoom for consistent appearance
  const effectiveZoom = (elementType === 'textbox' || elementType === 'image') ? 1 : zoom;

  // Style-specific defaults
  if (style === 'rough' && settings.roughness === undefined) {
    settings.roughness = elementType === 'shape' ? 8 : 8; // Consistent high roughness
  }

  if (style === 'candy') {
    if (settings.candyIntensity === undefined) settings.candyIntensity = 'middle';
    if (settings.candyRandomness === undefined) settings.candyRandomness = true;
  }

  return { styleSettings: settings, effectiveZoom };
}

/**
 * Renders a 4-sided rectangle border with style
 * Used for: textbox borders, image frames, rectangle strokes
 */
export function renderRectangleBorder(
  dimensions: RenderDimensions,
  options: RenderOptions
): RenderResult | null {
  if (!stylesEngine) {
    // Browser environment - will be handled by client-side wrapper
    throw new Error('Style engine not loaded. Use client-side wrapper.');
  }

  const { strokeWidth, color, opacity = 1, style, styleSettings = {}, zoom = 1, elementId = 'border-1', elementType = 'shape' } = options;

  // Resolve style settings
  const { styleSettings: resolvedSettings, effectiveZoom } = resolveStyleSettings(
    elementId,
    style,
    zoom,
    elementType,
    styleSettings
  );

  // Create temporary element for style engine
  const tempElement = {
    type: 'rect',
    id: elementId,
    x: dimensions.x,
    y: dimensions.y,
    width: dimensions.width,
    height: dimensions.height,
    cornerRadius: dimensions.cornerRadius || 0,
    stroke: color,
    strokeWidth: strokeWidth,
    borderWidth: strokeWidth,
    fill: 'transparent',
    style: style,
    opacity: opacity,
    roughness: resolvedSettings.roughness || 1,
    candyRandomness: resolvedSettings.candyRandomness,
    candyIntensity: resolvedSettings.candyIntensity,
    candySpacingMultiplier: resolvedSettings.candySpacingMultiplier,
    candyHoled: resolvedSettings.candyHoled,
    seed: resolvedSettings.seed
  };

  // Generate path and stroke properties
  const pathData = stylesEngine.generatePath(tempElement, effectiveZoom);
  const strokeProps = stylesEngine.getStrokeProps(tempElement, effectiveZoom);

  if (!pathData) return null;

  return {
    pathData,
    strokeProps,
    pathOffsetX: 0,
    pathOffsetY: 0
  };
}

/**
 * Renders a simple line element with style
 * Used for: line shapes, ruled lines in textboxes
 */
export function renderLineElement(
  dimensions: LineDimensions,
  options: RenderOptions
): RenderResult | null {
  if (!stylesEngine) {
    throw new Error('Style engine not loaded. Use client-side wrapper.');
  }

  const { strokeWidth, color, opacity = 1, style, styleSettings = {}, zoom = 1, elementId = 'line-1', elementType = 'shape' } = options;

  // Resolve style settings
  const { styleSettings: resolvedSettings, effectiveZoom } = resolveStyleSettings(
    elementId,
    style,
    zoom,
    elementType,
    styleSettings
  );

  // Create temporary line element
  // Lines are rendered relative to (0,0), offset is applied separately
  const width = dimensions.x2 - dimensions.x1;
  const height = dimensions.y2 - dimensions.y1;

  const tempElement = {
    type: 'line',
    id: elementId,
    x: 0,
    y: 0,
    width: width,
    height: height,
    stroke: color,
    strokeWidth: strokeWidth,
    borderWidth: strokeWidth,
    fill: 'transparent',
    style: style,
    opacity: opacity,
    roughness: resolvedSettings.roughness || 1,
    candyRandomness: resolvedSettings.candyRandomness,
    candyIntensity: resolvedSettings.candyIntensity,
    candySpacingMultiplier: resolvedSettings.candySpacingMultiplier,
    candyHoled: resolvedSettings.candyHoled,
    seed: resolvedSettings.seed
  };

  // Generate path and stroke properties
  const pathData = stylesEngine.generatePath(tempElement, effectiveZoom);
  const strokeProps = stylesEngine.getStrokeProps(tempElement, effectiveZoom);

  if (!pathData) return null;

  return {
    pathData,
    strokeProps,
    pathOffsetX: dimensions.x1,
    pathOffsetY: dimensions.y1
  };
}

/**
 * Renders a circle border with style
 * Used for: circle shapes
 */
export function renderCircleBorder(
  dimensions: CircleDimensions,
  options: RenderOptions
): RenderResult | null {
  if (!stylesEngine) {
    throw new Error('Style engine not loaded. Use client-side wrapper.');
  }

  const { strokeWidth, color, opacity = 1, style, styleSettings = {}, zoom = 1, elementId = 'circle-1', elementType = 'shape' } = options;

  // Resolve style settings
  const { styleSettings: resolvedSettings, effectiveZoom } = resolveStyleSettings(
    elementId,
    style,
    zoom,
    elementType,
    styleSettings
  );

  // Circle is defined by diameter as width/height
  const diameter = dimensions.radius * 2;
  const x = dimensions.centerX - dimensions.radius;
  const y = dimensions.centerY - dimensions.radius;

  const tempElement = {
    type: 'circle',
    id: elementId,
    x: x,
    y: y,
    width: diameter,
    height: diameter,
    stroke: color,
    strokeWidth: strokeWidth,
    borderWidth: strokeWidth,
    fill: 'transparent',
    style: style,
    opacity: opacity,
    roughness: resolvedSettings.roughness || 1,
    candyRandomness: resolvedSettings.candyRandomness,
    candyIntensity: resolvedSettings.candyIntensity,
    candySpacingMultiplier: resolvedSettings.candySpacingMultiplier,
    candyHoled: resolvedSettings.candyHoled,
    seed: resolvedSettings.seed
  };

  // Generate path and stroke properties
  const pathData = stylesEngine.generatePath(tempElement, effectiveZoom);
  const strokeProps = stylesEngine.getStrokeProps(tempElement, effectiveZoom);

  if (!pathData) return null;

  return {
    pathData,
    strokeProps,
    pathOffsetX: 0,
    pathOffsetY: 0
  };
}

/**
 * Renders a polygon border with style
 * Used for: triangles, polygons, and other complex shapes
 */
export function renderPolygonBorder(
  dimensions: PolygonDimensions,
  options: RenderOptions
): RenderResult | null {
  if (!stylesEngine) {
    throw new Error('Style engine not loaded. Use client-side wrapper.');
  }

  const { strokeWidth, color, opacity = 1, style, styleSettings = {}, zoom = 1, elementId = 'polygon-1', elementType = 'shape' } = options;

  // Resolve style settings
  const { styleSettings: resolvedSettings, effectiveZoom } = resolveStyleSettings(
    elementId,
    style,
    zoom,
    elementType,
    styleSettings
  );

  // Determine element type
  const elementTypeForEngine = dimensions.polygonType || 'polygon';

  const tempElement = {
    type: elementTypeForEngine,
    id: elementId,
    x: dimensions.x,
    y: dimensions.y,
    width: dimensions.width,
    height: dimensions.height,
    polygonSides: dimensions.sides || 5,
    stroke: color,
    strokeWidth: strokeWidth,
    borderWidth: strokeWidth,
    fill: 'transparent',
    style: style,
    opacity: opacity,
    roughness: resolvedSettings.roughness || 1,
    candyRandomness: resolvedSettings.candyRandomness,
    candyIntensity: resolvedSettings.candyIntensity,
    candySpacingMultiplier: resolvedSettings.candySpacingMultiplier,
    candyHoled: resolvedSettings.candyHoled,
    seed: resolvedSettings.seed
  };

  // Generate path and stroke properties
  const pathData = stylesEngine.generatePath(tempElement, effectiveZoom);
  const strokeProps = stylesEngine.getStrokeProps(tempElement, effectiveZoom);

  if (!pathData) return null;

  return {
    pathData,
    strokeProps,
    pathOffsetX: 0,
    pathOffsetY: 0
  };
}

/**
 * Helper: Create rectangle path configuration
 */
export function createRectPath(x: number, y: number, width: number, height: number) {
  return {
    type: 'rect' as const,
    x,
    y,
    width,
    height
  };
}

/**
 * Helper: Create line path configuration
 */
export function createLinePath(x1: number, y1: number, x2: number, y2: number) {
  return {
    type: 'line' as const,
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

/**
 * Helper: Create circle path configuration
 */
export function createCirclePath(centerX: number, centerY: number, radius: number) {
  return {
    type: 'circle' as const,
    centerX,
    centerY,
    radius
  };
}
