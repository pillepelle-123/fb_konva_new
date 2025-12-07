# Shared Utilities - Architektur-Dokumentation

## Übersicht

Das `shared/` Verzeichnis enthält plattformunabhängige Rendering-Logik, die sowohl im Client (Browser) als auch im Server (PDF-Export) verwendet wird. Dies ermöglicht konsistente Rendering-Ergebnisse zwischen beiden Umgebungen.

## Verzeichnisstruktur

```
shared/
├── data/
│   └── templates/
│       ├── themes.json           # Theme-Definitionen (shared)
│       └── color-palettes.json   # Farbpaletten-Definitionen (shared)
├── types/
│   ├── text-layout.ts           # TypeScript-Typen für Text-Layout
│   └── layout.ts                # TypeScript-Typen für Layout-Ergebnisse
├── utils/
│   ├── text-layout.ts           # Text-Layout-Funktionen (TypeScript)
│   ├── text-layout.server.js    # Text-Layout-Funktionen (JavaScript, CommonJS)
│   ├── qna-layout.ts            # QnA-Layout-Funktionen (TypeScript)
│   └── qna-layout.server.js     # QnA-Layout-Funktionen (JavaScript, CommonJS)
└── rendering/
    ├── index.js                 # Haupt-Rendering-Funktion für PDF-Export
    ├── render-background.js     # Background-Rendering
    ├── render-element.js        # Element-Rendering
    ├── render-qna.js            # QnA-Rendering
    ├── render-qna-inline.js     # QnA Inline-Rendering
    ├── render-ruled-lines.js    # Ruled Lines-Rendering
    └── utils/
        ├── palette-utils.js     # Palette-Utilities
        ├── theme-utils.js       # Theme-Utilities
        ├── color-utils.js       # Color-Utilities
        ├── image-utils.js       # Image-Utilities
        └── constants.js         # Konstanten (PAGE_DIMENSIONS, CANVAS_DIMS, PATTERNS)
```

## Core Utilities

### Text Layout (`shared/utils/text-layout.ts`)

Plattformunabhängige Funktionen für Text-Layout-Berechnungen:

**Funktionen:**
- `buildFont(style: RichTextStyle): string` - Erstellt Font-String für Canvas
- `getLineHeight(style: RichTextStyle): number` - Berechnet Zeilenhöhe
- `measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null): number` - Misst Textbreite
- `calculateTextX(text: string, style: RichTextStyle, startX: number, availableWidth: number, ctx: CanvasRenderingContext2D | null): number` - Berechnet X-Position basierend auf Alignment
- `wrapText(text: string, style: RichTextStyle, maxWidth: number, ctx: CanvasRenderingContext2D | null): TextLine[]` - Textumbruch

**Verwendung:**
```typescript
import { buildFont, getLineHeight, measureText, wrapText } from '@shared/utils/text-layout';

const style: RichTextStyle = {
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontBold: true,
  paragraphSpacing: 'medium'
};

const fontString = buildFont(style);
const lineHeight = getLineHeight(style);
const lines = wrapText('Long text...', style, 200, ctx);
```

### QnA Layout (`shared/utils/qna-layout.ts`)

Plattformunabhängige Funktionen für QnA-Layout-Berechnungen:

**Funktionen:**
- `createLayout(options: CreateLayoutOptions): LayoutResult` - Erstellt Layout für inline oder block Varianten
- `createBlockLayout(options: CreateBlockLayoutOptions): LayoutResult` - Erstellt Layout für block-Variante mit expliziter Position

**Verwendung:**
```typescript
import { createLayout, createBlockLayout } from '@shared/utils/qna-layout';

const layout = createLayout({
  questionText: 'What is your name?',
  answerText: 'My name is John',
  questionStyle: { fontSize: 16, fontFamily: 'Arial' },
  answerStyle: { fontSize: 14, fontFamily: 'Arial' },
  width: 200,
  height: 300,
  padding: 10,
  ctx: canvasContext,
  layoutVariant: 'inline'
});
```

## Rendering Utilities

### Background Rendering (`shared/rendering/render-background.js`)

Rendert Page-Backgrounds (Color, Pattern, Image):

**Features:**
- Color Backgrounds mit Opacity
- Pattern Backgrounds mit custom Patterns
- Image Backgrounds mit Proxy-Integration für S3-URLs
- Background Color für Pattern-Backgrounds

**Verwendung:**
```javascript
await renderBackground(
  layer,
  pageData,
  bookData,
  width,
  height,
  Konva,
  document,
  Image,
  null, // callback
  imagePromises,
  { token, apiUrl } // options for proxy
);
```

### Element Rendering (`shared/rendering/render-element.js`)

Rendert einzelne Canvas-Elemente (shapes, images, text):

**Unterstützte Elemente:**
- Rect, Circle, Line
- Images
- Text (qna, qna_inline, free_text)
- Themed Shapes (rough, default, etc.)

### QnA Rendering (`shared/rendering/render-qna.js`, `render-qna-inline.js`)

Rendert QnA-Elemente mit verschiedenen Layout-Varianten:

**Features:**
- Inline Layout (question und answer nebeneinander)
- Block Layout (question oben/unten/links/rechts)
- Ruled Lines-Unterstützung
- Background Fill-Unterstützung
- Verschiedene Themes

### Ruled Lines (`shared/rendering/render-ruled-lines.js`)

Rendert Ruled Lines für QnA-Elemente:

**Features:**
- Verschiedene Themes (rough, default, etc.)
- Anpassbare Farbe, Breite, Opacity
- Automatische Positionierung basierend auf Text-Layout

## Type Definitions

### `RichTextStyle` (`shared/types/text-layout.ts`)

```typescript
interface RichTextStyle {
  fontSize: number;
  fontFamily: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontColor?: string;
  fontOpacity?: number;
  align?: 'left' | 'center' | 'right' | 'justify';
  paragraphSpacing?: 'small' | 'medium' | 'large';
}
```

### `LayoutResult` (`shared/types/layout.ts`)

```typescript
interface LayoutResult {
  runs: TextRun[];           // Text-Runs mit Positionen
  contentHeight: number;     // Höhe des Inhalts
  linePositions: LinePosition[];  // Zeilen-Positionen
  questionArea?: { x, y, width, height };  // Optional für block layout
  answerArea?: { x, y, width, height };    // Optional für block layout
}
```

## Client-Integration

### TypeScript Imports

```typescript
import { buildFont, getLineHeight } from '@shared/utils/text-layout';
import { createLayout } from '@shared/utils/qna-layout';
import type { RichTextStyle } from '@shared/types/text-layout';
```

**Alias-Konfiguration:**
- Vite: `@shared` → `../../shared`
- TypeScript: In `tsconfig.app.json` definiert

### Feature Flags

Optional können Feature-Flags verwendet werden für schrittweise Migration:

```typescript
import { FEATURE_FLAGS } from '../../utils/feature-flags';

const buildFont = FEATURE_FLAGS.USE_SHARED_TEXT_LAYOUT 
  ? sharedBuildFont 
  : localBuildFont;
```

**Standard:** Alle Feature-Flags sind aktiviert (`true`).

## Server-Integration

### CommonJS Imports

Server-seitig werden JavaScript-Versionen verwendet:

```javascript
const { buildFont, getLineHeight } = require('../utils/text-layout.server');
const { createLayout } = require('../utils/qna-layout.server');
```

### Browser-Compatible Code

Die Server-seitigen Module werden in Browser-kompatible Code konvertiert:

1. `require()` und `module.exports` werden entfernt
2. Funktionen werden global verfügbar gemacht (`window.renderPageWithKonva`)
3. Daten werden als JSON eingebettet (themes, palettes)

**Datei:** `server/services/pdf-export.js` - `writeSharedRenderingModulesToFiles()`

## Migration-Status

### ✅ Abgeschlossen

- ✅ Text-Layout-Funktionen migriert
- ✅ QnA-Layout-Funktionen migriert
- ✅ Themes und Palettes zentralisiert
- ✅ Server-seitiges Rendering verwendet shared Utilities
- ✅ Client-seitiges Rendering verwendet shared Utilities
- ✅ Alle Tests bestehen

### 📋 Verwendung

**Client:**
- `client/src/components/features/editor/canvas-items/textbox-qna.tsx`
- `client/src/components/pdf-renderer/pdf-renderer.tsx`

**Server:**
- `shared/rendering/render-qna.js`
- `shared/rendering/render-qna-inline.js`
- `server/services/pdf-export.js`

## Best Practices

### 1. Konsistenz zwischen Client und Server

- Verwende immer die shared Utilities für Layout-Berechnungen
- Teste sowohl Client- als auch Server-Rendering

### 2. Type Safety

- Verwende TypeScript-Typen aus `shared/types/`
- Konvertiere zu JavaScript für Server-seitige Verwendung

### 3. Feature Flags

- Feature-Flags sind optional, standardmäßig aktiviert
- Können für schrittweise Migration verwendet werden

### 4. Testing

- Unit-Tests für alle shared Utilities
- Integration-Tests für Rendering-Pipelines
- Visuelle Vergleichstests zwischen Client und Server

## Weitere Ressourcen

- **Migration-Plan:** `docs/migration/plan-status.md`
- **Visuelle Unterschiede:** `docs/migration/visual-differences.md`
- **Test-Dokumentation:** `docs/testing/`
- **Feature-Flags:** `client/src/utils/feature-flags.ts`

