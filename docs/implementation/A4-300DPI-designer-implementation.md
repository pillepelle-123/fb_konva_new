# A4 @ 300 DPI Designer Implementation

## Summary

Updated the Background Image Designer to use A4 at 300 DPI as the base canvas, with absolute item sizing and position-only scaling. This ensures items maintain their size across different page formats while adapting their positions to different page dimensions.

## Changes Made

### 1. Canvas Dimensions
- **Old**: 1200 × 1600 pixels (arbitrary aspect ratio)
- **New**: 2480 × 3508 pixels (A4 @ 300 DPI)
- **Why**: Professional print quality at A4 300 DPI standard

### 2. Item Size System
- **Old**: All dimensions (width, height, fontSize) were normalized (0-1 range)
- **New**: 
  - **Positions** (x, y): Normalized (0-1 range) - scales with page size
  - **Sizes** (width, height): Absolute pixels - DO NOT scale
  - **Text** (fontSize): Absolute pixels - DO NOT scale

#### Example:
```typescript
// Item definition in designer canvas
const item: DesignerImageItem = {
  x: 0.5,              // Normalized position (will scale with page)
  y: 0.5,              // Normalized position (will scale with page)
  width: 400,          // Absolute pixels (stays 400 regardless of page size)
  height: 300,         // Absolute pixels (stays 300 regardless of page size)
};
```

### 3. Conversion Functions Updated

#### `normalizedToAbsolute()`
```typescript
// Before: x *= canvasWidth, y *= canvasHeight, width *= canvasWidth, height *= canvasHeight
// After: x *= canvasWidth, y *= canvasHeight, width = width, height = height
```

#### `absoluteToNormalized()`
```typescript
// Before: x /= canvasWidth, y /= canvasHeight, width /= canvasWidth, height /= canvasHeight
// After: x /= canvasWidth, y /= canvasHeight, width = width, height = height
```

#### `calculatePositionFromPreset()`
```typescript
// Now works with absolute item sizes:
// - Calculates normalized offset based on absolute item size
// - Returns normalized position (0-1) that centers/positions item correctly
```

### 4. Hook Changes: `useDesignerCanvas.ts`

#### Canvas Constants
```typescript
// Old
const canvasWidth = 1200;
const canvasHeight = 1600;

// New
const canvasWidth = 2480;   // A4 @ 300 DPI
const canvasHeight = 3508;  // A4 @ 300 DPI
```

#### Item Addition Methods

**addImageItem()**
```typescript
// Old: addImageItem(path, 200, 200) → width = 200/1200, height = 200/1600 (normalized)
// New: addImageItem(path, 400, 400) → width = 400, height = 400 (absolute pixels)
```

**addTextItem()**
```typescript
// Old: fontSize = 0.06 (6% of canvas height)
// New: fontSize = 48 (absolute pixels)
```

**addStickerItem()**
```typescript
// Old: addStickerItem(id, 150, 150) → width = 150/1200, height = 150/1600 (normalized)
// New: addStickerItem(id, 300, 300) → width = 300, height = 300 (absolute pixels)
```

### 5. UI Changes: `designer-property-panel.tsx`

#### Width/Height Inputs
```typescript
// Old
const itemWidth = Math.round(item.width * canvasWidth);
onChange={(e) => onItemUpdate({ width: Number(e.target.value) / canvasWidth })}

// New
const itemWidth = Math.round(item.width);  // Already absolute
onChange={(e) => onItemUpdate({ width: Number(e.target.value) })}  // Direct value
```

#### Font Size Input
```typescript
// Old
value={Math.round(item.fontSize * canvasHeight)}
onChange={(e) => onItemUpdate({ fontSize: Number(e.target.value) / canvasHeight })}

// New
value={Math.round(item.fontSize)}  // Already absolute
onChange={(e) => onItemUpdate({ fontSize: Number(e.target.value) })}  // Direct value
```

### 6. Canvas Rendering: `designer-canvas.tsx`

#### Scale Adjustment for UI Display
```typescript
// A4 @ 300 DPI is 2480×3508 - much larger than screen
// Scale canvas to 25% for usable UI (matches design canvas better)
style={{
  width: `${canvasWidth * 0.25}px`,
  height: `${canvasHeight * 0.25}px`,
  transform: 'scale(0.25)',
  transformOrigin: 'top left',
}}
```

## How Position-Only Scaling Works

### Designer Canvas
```
Canvas: 2480×3508 (A4 @ 300 DPI)
Item Position: x=0.5, y=0.5
Item Size: width=400, height=300
Rendering Position: 1240, 1754 (center)
```

### Editor - Same Size (A4)
```
Canvas: 2480×3508 (A4 @ 300 DPI)
Item Position: x=0.5, y=0.5 (unchanged)
Item Size: width=400, height=300 (unchanged)
Rendering Position: 1240, 1754 (center)
```

### Editor - Different Size (A5)
```
Canvas: 1748×2480 (A5 @ 300 DPI)
Item Position: x=0.5, y=0.5 (unchanged)  ← Normalized position stays the same
Item Size: width=400, height=300 (unchanged)  ← Size stays absolute
Rendering Position: 874, 1240 (center of A5)  ← Different absolute position due to smaller canvas size
```

### Editor - Different Size (Square 21×21cm)
```
Canvas: 1968×1968 (Square @ 300 DPI)
Item Position: x=0.5, y=0.5 (unchanged)
Item Size: width=400, height=300 (unchanged)
Rendering Position: 984, 984 (center of square)
```

## Benefits

1. **Professional Print Quality**: A4 @ 300 DPI is industry standard
2. **Consistent Item Sizing**: Items maintain exact pixel dimensions across pages
3. **Flexible Positioning**: Normalized positions allow items to adapt to different page sizes
4. **Grid-Based Placement**: 9-position grid system works automatically with different page dimensions
5. **No Scaling Artifacts**: Since items don't scale, no loss of quality or pixelation

## Integration with Editor

When the editor needs to render designer backgrounds in different page sizes:

1. Load the designer's `CanvasStructure` (positions normalized, sizes absolute)
2. Convert positions based on current page size: `x * currentPageWidth`
3. Keep item sizes unchanged
4. Render as Konva Group in editor's background layer

Example:
```typescript
// In editor canvas
const designerBackground = {
  x: 0.5,        // Normalized
  y: 0.5,        // Normalized
  width: 400,    // Absolute
  height: 300,   // Absolute
};

// Rendering at A5:
const a5PageWidth = 1748;
const a5PageHeight = 2480;

const renderPosition = {
  x: designerBackground.x * a5PageWidth,      // 874
  y: designerBackground.y * a5PageHeight,     // 1240
  width: designerBackground.width,            // 400 (unchanged)
  height: designerBackground.height,          // 300 (unchanged)
};
```

## Database Implications

The `canvas` JSONB field in `background_image_designs` table stores:
- Positions as normalized (0-1)
- Sizes as absolute pixels

This compact format works consistently across all page sizes without data migration.

## Files Modified

1. **shared/types/background-designer.ts**
   - Updated `DesignerItemBase` to document absolute sizes
   - Updated `DesignerTextItem` fontSize as absolute
   - Updated `DEFAULT_DESIGNER_CANVAS` to 2480×3508
   - Updated conversion functions (normalizedToAbsolute, absoluteToNormalized)
   - Updated calculatePositionFromPreset()

2. **client/src/components/features/admin/background-designer/hooks/useDesignerCanvas.ts**
   - Updated canvas constants to 2480×3508
   - Updated addImageItem() to work with absolute sizes
   - Updated addTextItem() to use absolute fontSize (48)
   - Updated addStickerItem() to work with absolute sizes
   - Updated applyPositionPreset() logic

3. **client/src/components/features/admin/background-designer/designer-canvas.tsx**
   - Added scale(0.25) transform for UI display
   - Canvas renders at native 2480×3508 internally

4. **client/src/components/features/admin/background-designer/designer-property-panel.tsx**
   - Updated item dimension calculations to use direct values (no multiplication)
   - Updated width/height inputs to work with absolute pixels
   - Updated fontSize input to work with absolute pixels

## Next Steps

1. **Backend Image Generation**: Implement Konva.js-based rendering for designer backgrounds
   - Pre-load all assets before rendering
   - Create Konva.Group for efficient rendering
   - Cache results for performance

2. **Editor Integration**: 
   - Extend background image listing to include designer backgrounds
   - Implement position-scale rendering in editor canvas
   - Test with all page sizes (A4, A5, Square 21×21cm)

3. **Testing**:
   - Verify items maintain size across page formats
   - Verify position grid placement works correctly
   - Test PDF export at 300 DPI

## Technical Notes

- Items with position-only scaling maintain professional quality
- No pixelation or scaling artifacts
- Database storage remains compact
- Backward compatible with template backgrounds
- Ready for WebP/PNG export at any page size
