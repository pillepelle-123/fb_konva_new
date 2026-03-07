# Background Image Designer - Implementation Guide

## ✅ COMPLETED IMPLEMENTATION

### ✅ Phase 1: Database Migrations
- Created migration file: `add_background_image_designer_support.sql`
- Tables: `background_image_templates`, `background_image_designs`
- Separate theme background tables: `theme_template_backgrounds`, `theme_designer_backgrounds`
- View for unified queries: `theme_backgrounds_unified`

### ✅ Phase 2: Shared Types & Components
- Created shared types: `shared/types/background-designer.ts`
  - `DesignerItem` types (Image, Text, Sticker)
  - `CanvasStructure` with normalized positions (0-1)
  - Helper functions: `normalizedToAbsolute`, `absoluteToNormalized`, etc.
  - Position calculation: `calculatePositionFromPreset()`
- Created shared Konva components: `client/src/components/shared/konva/`
  - `image-item.tsx` - Reusable image with transform
  - `text-item.tsx` - Reusable text with formatting
  - `sticker-item.tsx` - Reusable sticker renderer
  - `hooks.ts` - `useKonvaStage`, `useItemSelection`, `useItemTransform`
  - `index.ts` - Barrel export

### ✅ Phase 3: Backend APIs & Services
- Created: `server/services/background-image-designer.js`
  - `createDesignerImage()` - New designer image
  - `getDesignerImage()` - Fetch by ID
  - `updateDesignerImage()` - Update canvas structure
  - `deleteDesignerImage()` - Delete with cleanup
  - `getDesignerAssets()` - Extract assets from structure
  - `markAsGenerated()` - Update after generation
  
- Created: `server/routes/admin/background-image-designer.js`
  - `GET /api/admin/background-images/designer` - List
  - `POST /api/admin/background-images/designer` - Create
  - `GET /api/admin/background-images/designer/:id` - Read
  - `PUT /api/admin/background-images/designer/:id` - Update
  - `DELETE /api/admin/background-images/designer/:id` - Delete
  - `POST /api/admin/background-images/designer/assets/upload` - Upload asset
  - `DELETE /api/admin/background-images/designer/assets/:filename` - Delete asset
  - `POST /api/admin/background-images/designer/:id/generate` - Generate image (placeholder)
  - `GET /api/admin/background-images/designer/:id/preview` - Get preview

- Updated: `server/routes/admin/index.js` - Designer routes registered

### ✅ Phase 5-6: Designer UI Components & State Management
**Location:** `client/src/components/features/admin/background-designer/`

**Components Created:**
- `index.tsx` - Main designer entry point
  - Load/create designs
  - Auto-save with debounce
  - Upload images & stickers
  - Generate final image
  
- `designer-canvas.tsx` - Konva canvas editor
  - Renders items with normalized→absolute conversion
  - Full transformation support (drag, resize, rotate)
  - Click-to-select interaction
  
- `designer-toolbar.tsx` - Top toolbar
  - Add Image, Text, Sticker
  - Save & Generate buttons
  - Dirty state indicator
  
- `designer-property-panel.tsx` - Right panel
  - Edit text content, font, color
  - Transform by numerical input
  - Position presets (9 buttons)
  - Layer controls (forward/back)
  - Duplicate & Delete
  
- `position-buttons.tsx` - 9-position grid
  - `top-left`, `top-center`, `top-right`
  - `center-left`, `center`, `center-right`
  - `bottom-left`, `bottom-center`, `bottom-right`
  
- `image-upload-dialog.tsx` - File upload
  - Drag & drop support
  - File validation (SVG/PNG/JPG, 5MB max)
  
- `sticker-selector-dialog.tsx` - Sticker browser
  - Search & category filter
  - Thumbnail grid display
  
- `hooks/useDesignerCanvas.ts` - Full state management
  - Canvas background (color, opacity)
  - Add/Update/Delete items
  - Selection management
  - Transform operations
  - Position presets application
  - Layer management (z-index)
  - Duplicate items
  - Auto-save (2s debounce)
  - Manual save with callback
  
- `index.ts` - Barrel export

### ✅ Phase 7: Editor Integration Preparation
- Created `client/src/admin/services/background-images-api.ts`
  - Unified API wrapper for both image types
  - Fallback logic (try designer → template)

## Next Steps

### 🔄 Phase 3: Backend APIs (In Progress)

#### Required Endpoints

**Designer Management:**
```
POST   /api/admin/background-images/designer          - Create new designer image
GET    /api/admin/background-images/designer/:id      - Get designer image details
PUT    /api/admin/background-images/designer/:id      - Update designer image
DELETE /api/admin/background-images/designer/:id      - Delete designer image
```

**Asset Upload:**
```
POST   /api/admin/background-images/designer/assets/upload     - Upload image asset
DELETE /api/admin/background-images/designer/assets/:filename  - Delete asset
```

**Image Generation:**
```
POST   /api/admin/background-images/designer/:id/generate    - Generate final image from canvas
GET    /api/admin/background-images/designer/:id/preview     - Get preview image
```

#### Service Functions to Create

`server/services/background-image-designer.js`:
- `createDesignerImage(data)` - Create new designer Background Image
- `getDesignerImage(id)` - Get designer image with canvas structure
- `updateDesignerImage(id, data)` - Update canvas structure
- `deleteDesignerImage(id)` - Delete designer image
- `generateImageFromCanvas(canvasStructure, outputSize)` - Generate final image

### 📋 Phase 4: Image Generation Service

**Requirements:**
- Node.js canvas library (`canvas` package)
- Load images, text, stickers from canvas structure
- Apply normalized positions to target size
- Generate WebP/PNG output
- Create thumbnail

**Service file:** `server/services/canvas-image-generator.js`

Key methods:
- `generateImage(canvasStructure, width, height)` → Buffer
- `createThumbnail(imageBuffer, width, height)` → Buffer
- `loadAsset(path)` → Image
- `renderText(ctx, textItem)` → void
- `renderImage(ctx, imageItem, images)` → void
- `renderSticker(ctx, stickerItem)` → void

### 📋 Phase 5: Designer UI Components

**Location:** `client/src/components/features/admin/background-designer/`

**Main Components:**
```
background-designer/
├── index.tsx                       - Main designer page
├── designer-canvas.tsx             - Konva canvas with items
├── designer-toolbar.tsx            - Top toolbar (New, Save, Generate)
├── designer-sidebar.tsx            - Left sidebar (Add items)
├── designer-property-panel.tsx    - Right panel (Item properties)
├── position-buttons.tsx            - 9-position quick placement grid
├── layer-panel.tsx                 - Z-index management
├── image-upload-dialog.tsx         - Upload images from PC
├── sticker-selector-dialog.tsx    - Select from sticker library
├── hooks/
│   ├── useDesignerCanvas.ts       - Canvas state management
│   ├── useDesignerItems.ts        - Items CRUD operations
│   └── useImageGeneration.ts      - Image generation API calls
└── types.ts                        - Local TypeScript types
```

**Key Features:**
- Drag & drop items on canvas
- Transform tools (move, resize, rotate)
- Position presets (9 buttons)
- Layer management (bring to front, send to back)
- Real-time preview
- Export/Generate final image

### 📋 Phase 6: Designer State Management

**Hook: `useDesignerCanvas.ts`**
```typescript
interface DesignerState {
  canvasStructure: CanvasStructure;
  selectedItemId: string | null;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  backgroundOpacity: number;
}

function useDesignerCanvas(designId?: string) {
  // Load existing design or create new
  // CRUD operations for items
  // Selection management
  // Undo/redo (optional)
  // Auto-save (debounced)
}
```

### 📋 Phase 7: Editor Integration

**Transparent Integration:**

No changes visible to end-user in editor. Background images vom Typ "designer" werden genauso behandelt wie "template".

**Required Changes:**
1. `background-image-selector.tsx`:
   - Fetch includes both types
   - No filter/grouping by type
   
2. `background-images.ts` (data layer):
   - API fetch includes type field
   - Map both types to `BackgroundImageWithUrl`

3. `page-background-settings.tsx`:
   - No changes needed (works with URLs)

## Database Schema

### background_images
- `type` VARCHAR(20) - 'template' | 'designer' (replaces `format`)
- All other fields shared between both types

### background_image_templates
- `id` UUID FK → background_images(id)
- Template-specific fields (original_filename, file_size, etc.)

### background_image_designs
- `id` UUID FK → background_images(id)
- `canvas_structure` JSONB - Normalized canvas data
- `canvas_width` INTEGER - Base canvas width (1200)
- `canvas_height` INTEGER - Base canvas height (1600)
- `version` INTEGER - For cache invalidation
- `generated_image_cache` JSONB - Cached generated images

### theme_template_backgrounds / theme_designer_backgrounds
- Separate tables for cleaner schema
- template: includes size, position, repeat, width
- designer: only opacity (always fullscreen)

## Normalized Position System (Hybrid Approach)

**In Designer (Absolute):**
- Canvas: 1200×1600px fixed
- Item positions in pixels

**In Database (Normalized):**
- Positions: 0-1 range (percentage)
- Example: x=0.5 → 50% from left

**In Editor (Scaled):**
- Apply to actual page size
- Example: 800×1200 book → x=0.5 → x=400px

**Conversion Functions:**
See `shared/types/background-designer.ts`:
- `normalizedToAbsolute(item, width, height)`
- `absoluteToNormalized(item, width, height)`
- `canvasStructureToAbsolute(structure, width, height)`
- `canvasStructureToNormalized(structure)`

## File Upload Structure

**Designer Assets:**
```
uploads/background-images/designer/
├── item_[uuid]_[timestamp].svg
├── item_[uuid]_[timestamp].png
└── item_[uuid]_[timestamp].jpg
```

**Generated Background Images:**
```
uploads/background-images/generated/
├── [design-id]_v[version].webp
└── [design-id]_v[version]_thumb.webp
```

## API Response Formats

### Designer Image Response
```json
{
  "image": {
    "id": "uuid",
    "slug": "summer-design",
    "name": "Summer Design",
    "type": "designer",
    "category": {...},
    "storage": {
      "filePath": "/uploads/background-images/generated/uuid_v1.webp",
      "thumbnailPath": "/uploads/background-images/generated/uuid_v1_thumb.webp",
      "publicUrl": "http://...",
      "thumbnailUrl": "http://..."
    },
    "canvas": {
      "canvasWidth": 1200,
      "canvasHeight": 1600,
      "structure": {
        "backgroundColor": "#f0f0f0",
        "backgroundOpacity": 1,
        "items": [...]
      }
    },
    "defaults": {
      "opacity": 1
    }
  }
}
```

## Implementation Order

1. ✅ Database migrations
2. ✅ Shared types & components
3. 🔄 Backend API routes & services (current)
4. ⏳ Image generation service
5. ⏳ Designer UI components
6. ⏳ Designer hooks & state management
7. ⏳ Editor integration
8. ⏳ Testing & optimization

## Testing Checklist

- [ ] Create new designer image
- [ ] Add image items to canvas
- [ ] Add text items to canvas
- [ ] Add sticker items to canvas
- [ ] Transform items (move, resize, rotate)
- [ ] Use position presets (9 buttons)
- [ ] Layer management (z-index)
- [ ] Generate final image
- [ ] Save designer image
- [ ] Load existing designer image
- [ ] Delete designer image
- [ ] Apply designer image to page in editor
- [ ] Scale to different page sizes (normalized positions)
- [ ] Theme integration (via theme_designer_backgrounds)

## Notes

- **Performance:** Generated images are cached in database (generated_image_cache)
- **Security:** Only admins can create/edit designer images
- **File Size:** Designer assets max 5MB per file
- **Aspect Ratio:** Designer canvas is A4-like (1200×1600)
- **Color Management:** Free color selection (no palette slots for now)
- **Sticker Colors:** Free color choice in designer

## Next Step

Continue with Phase 3: Implement backend API routes and services for designer CRUD operations.
