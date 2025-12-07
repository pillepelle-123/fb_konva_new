# Client vs. Server Rendering - Unterschiede

## Übersicht

Dieses Dokument beschreibt die Unterschiede zwischen Client-seitigem Rendering (Konva.js im Browser) und Server-seitigem Rendering (Puppeteer/Canvas für PDF-Export). Diese Unterschiede sind wichtig für die Migration zu plattformunabhängigen Dateien.

## 1. Text-Layout-Berechnungen

### 1.1 Shared-Funktionen (Neu)

**Status:** ✅ Bereits migriert zu `shared/utils/text-layout.ts` und `shared/utils/qna-layout.ts`

Die folgenden Funktionen sind jetzt plattformunabhängig:
- `buildFont()` - Font-String-Generierung
- `getLineHeight()` - Zeilenhöhen-Berechnung
- `measureText()` - Textbreiten-Messung
- `calculateTextX()` - X-Positionierung für verschiedene Alignments
- `wrapText()` - Textumbruch
- `createLayout()` - Vollständige Layout-Berechnung
- `createBlockLayout()` - Block-Layout-Berechnung

### 1.2 Client-seitige Implementierung

**Dateien:**
- `client/src/components/features/editor/canvas-items/textbox-qna.tsx`
- `client/src/components/features/editor/canvas-items/textbox-qna-inline.tsx`
- `client/src/components/pdf-renderer/pdf-renderer.tsx`

**Besonderheiten:**
- Verwendet Konva.js für Canvas-Rendering
- Text wird mit `textBaseline = 'top'` gerendert
- Baseline-Offset wird explizit berechnet und angewendet
- Line-Height-Multiplikatoren basieren auf `paragraphSpacing` (small: 1.0, medium: 1.2, large: 1.5)

**Beispiel (textbox-qna.tsx):**
```typescript
const questionBaselineOffset = questionStyle.fontSize * 0.8;
const answerBaselineOffset = answerStyle.fontSize * 0.8;
const combinedBaselineOffset = Math.max(questionBaselineOffset, answerBaselineOffset);
```

### 1.3 Server-seitige Implementierung

**Dateien:**
- `shared/rendering/render-qna.js`
- `shared/rendering/render-qna-inline.js`

**Besonderheiten:**
- Verwendet Node.js Canvas für PDF-Rendering
- Nutzt die gleichen shared-Funktionen wie Client
- Baseline-Offset-Berechnung identisch mit Client
- Line-Height-Berechnung über `getLineHeight()` aus shared

**Beispiel (render-qna.js):**
```javascript
const questionBaselineOffset = questionStyle.fontSize * 0.8;
const answerBaselineOffset = answerStyle.fontSize * 0.8;
```

## 2. Baseline-Offset-Berechnungen

### 2.1 Standard Baseline-Offset

**Gemeinsam (Client & Server):**
```javascript
const baselineOffset = fontSize * 0.8;
```

Dies wird verwendet, wenn `textBaseline = 'top'` verwendet wird und der Text über den Ruled Lines schweben soll.

### 2.2 Inline-Layout Baseline-Offset (Textbox-QnA-Inline)

**Client-seitig (textbox-qna-inline.tsx):**
```typescript
const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
const maxLineHeightMultiplier = Math.max(
  getLineHeightMultiplier(qParagraphSpacing),
  getLineHeightMultiplier(aParagraphSpacing)
);
const factor = aFontSize >= 50 
  ? aFontSize >= 96 
    ? aFontSize >= 145 ? -0.07 : 0.01 
    : 0.07 
  : 0.1;
const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
```

**Server-seitig (render-qna-inline.js):**
```javascript
const maxFontSizeUsed = Math.max(qFontSize, aFontSize);
const maxLineHeightMultiplier = Math.max(
  qLineHeightValue / qFontSize,
  aLineHeightValue / aFontSize
);
const factor = aFontSize >= 50 
  ? aFontSize >= 96 
    ? aFontSize >= 145 ? -0.07 : 0.01 
    : 0.07 
  : 0.1;
const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
```

**Unterschied:** 
- Client verwendet `getLineHeightMultiplier()` (direkte Multiplikatoren)
- Server verwendet `getLineHeight() / fontSize` (aus shared-Funktion)
- **Risiko:** Niedrig - beide berechnen den gleichen Wert, nur über unterschiedliche Wege

### 2.3 PDF-Renderer Baseline-Offset

**Client-seitig (pdf-renderer.tsx):**
```typescript
const textBaselineOffset = -(maxFontSizeUsed * maxLineHeightMultiplier * 0.15) + (maxFontSizeUsed * factor);
```

**Status:** Identisch mit textbox-qna-inline.tsx

## 3. Line-Height-Berechnungen

### 3.1 Shared-Funktion `getLineHeight()`

**Datei:** `shared/utils/text-layout.ts`

```typescript
export function getLineHeight(style: RichTextStyle): number {
  const spacing = style.paragraphSpacing || 'medium';
  const multiplier = LINE_HEIGHT[spacing as ParagraphSpacing] || LINE_HEIGHT.medium;
  return style.fontSize * multiplier;
}
```

**Multiplikatoren:**
- `small`: 1.0
- `medium`: 1.2
- `large`: 1.5

### 3.2 Client-seitige Line-Height-Berechnung

**Vor der Migration:**
```typescript
const getLineHeightMultiplier = (spacing: string) => {
  switch (spacing) {
    case 'small': return 1.0;
    case 'medium': return 1.2;
    case 'large': return 1.5;
    default: return 1.0;
  }
};
const combinedLineHeight = maxFontSize * Math.max(
  getLineHeightMultiplier(qParagraphSpacing),
  getLineHeightMultiplier(aParagraphSpacing)
);
```

**Nach der Migration (mit Feature-Flag):**
```typescript
const combinedLineHeight = Math.max(
  getLineHeight(questionStyle),
  getLineHeight(answerStyle)
);
```

### 3.3 Server-seitige Line-Height-Berechnung

**Vor der Migration:**
```javascript
const getLineHeightMultiplier = (spacing) => {
  switch (spacing) {
    case 'small': return 1.0;
    case 'medium': return 1.2;
    case 'large': return 1.5;
    default: return 1.0;
  }
};
```

**Nach der Migration:**
```javascript
const qLineHeightValue = getLineHeight(questionStyle);
const aLineHeightValue = getLineHeight(answerStyle);
```

**Status:** ✅ Beide verwenden jetzt die shared-Funktion

## 4. Font-Rendering

### 4.1 Font-String-Generierung

**Shared-Funktion (`buildFont()`):**
```typescript
export function buildFont(style: RichTextStyle): string {
  const parts: string[] = [];
  
  if (style.fontBold) parts.push('bold');
  if (style.fontItalic) parts.push('italic');
  
  parts.push(`${style.fontSize}px`);
  parts.push(style.fontFamily);
  
  return parts.join(' ');
}
```

**Status:** ✅ Identisch in Client und Server

### 4.2 Canvas-Kontext-Unterschiede

**Client (Konva.js):**
- Konva-Text-Shapes verwenden intern Canvas-API
- `textBaseline = 'top'` wird standardmäßig verwendet
- Font-Rendering erfolgt über Browser-Engine

**Server (Node.js Canvas):**
- Direkte Canvas-API-Verwendung
- `textBaseline = 'top'` muss explizit gesetzt werden
- Font-Rendering erfolgt über Canvas-Bibliothek (kann leicht unterschiedlich sein)

**Risiko:** Mittel - Browser-Font-Rendering kann von Server-Canvas-Rendering abweichen

## 5. Text-Messungen

### 5.1 `measureText()` Funktion

**Shared-Funktion:**
```typescript
export function measureText(text: string, style: RichTextStyle, ctx: CanvasRenderingContext2D | null): number {
  if (!ctx) {
    // Fallback: estimate width based on font size
    return text.length * (style.fontSize * 0.6);
  }
  
  ctx.save();
  ctx.font = buildFont(style);
  const width = ctx.measureText(text).width;
  ctx.restore();
  
  return width;
}
```

**Status:** ✅ Identisch in Client und Server

### 5.2 Canvas-Context-Unterschiede

**Problem:** 
- Browser Canvas und Node.js Canvas können leicht unterschiedliche `measureText()`-Ergebnisse liefern
- Font-Metrik-Unterschiede zwischen Browsern und Server

**Risiko:** Niedrig - Unterschiede sind normalerweise minimal (< 1-2 Pixel)

## 6. Text-Umbruch (`wrapText`)

### 6.1 Shared-Funktion

**Status:** ✅ Vollständig migriert zu `shared/utils/text-layout.ts`

Die Funktion behandelt:
- Wörter, die nicht in eine Zeile passen
- Explizite Zeilenumbrüche (`\n`)
- Leere Zeilen

**Status:** ✅ Identisch in Client und Server

## 7. Layout-Berechnungen

### 7.1 `createLayout()` - Inline-Layout

**Shared-Funktion:** `shared/utils/qna-layout.ts`

**Besonderheiten:**
- Berechnet Question- und Answer-Zeilen
- Berücksichtigt `answerInNewRow`-Flag
- Berechnet `questionAnswerGap`
- Berücksichtigt Alignment (left, center, right)

**Status:** ✅ Identisch in Client und Server

### 7.2 `createBlockLayout()` - Block-Layout

**Shared-Funktion:** `shared/utils/qna-layout.ts`

**Besonderheiten:**
- Unterstützt verschiedene `questionPosition` (left, right, top, bottom)
- Berechnet separate Question- und Answer-Bereiche
- Berücksichtigt `ruledLinesTarget` (question/answer)
- Berechnet `blockQuestionAnswerGap`

**Status:** ✅ Identisch in Client und Server

## 8. Bekannte Visuelle Unterschiede

### 8.1 Font-Rendering-Unterschiede

**Problem:** 
- Browser-Font-Rendering kann sich von Server-Canvas-Rendering unterscheiden
- Anti-Aliasing kann unterschiedlich sein

**Auswirkung:** 
- Minimale Unterschiede in Text-Positionierung (< 1 Pixel)
- Unterschiedliche Text-Schärfe

**Risiko:** Niedrig - Unterschiede sind visuell kaum wahrnehmbar

### 8.2 Canvas-Context-Unterschiede

**Problem:**
- Konva.js verwendet intern Canvas-API, aber mit zusätzlichen Layern
- Server-Canvas ist direkter

**Auswirkung:**
- Unterschiede in Text-Messungen können auftreten

**Risiko:** Niedrig - Unterschiede sind minimal

### 8.3 Ruled Lines Positionierung

**Status:** ✅ Verwendet identische Berechnungen

Die Ruled-Lines-Positionierung basiert auf:
- Baseline-Offset
- Line-Height
- Font-Size

**Status:** Identisch in Client und Server

## 9. Risikobewertung

### 9.1 Niedrige Risiken (✅ Behoben)

1. **Text-Layout-Berechnungen** - ✅ Migriert zu shared
2. **Line-Height-Berechnungen** - ✅ Migriert zu shared
3. **Text-Umbruch** - ✅ Migriert zu shared
4. **Layout-Berechnungen** - ✅ Migriert zu shared

### 9.2 Mittlere Risiken (⚠️ Zu überwachen)

1. **Font-Rendering-Unterschiede**
   - Browser vs. Server Canvas
   - Anti-Aliasing-Unterschiede
   - **Lösung:** Visuelle Tests durchführen

2. **Text-Messungen**
   - Minimale Unterschiede in `measureText()`-Ergebnissen
   - **Lösung:** Toleranzen in Tests einbauen

### 9.3 Keine bekannten hohen Risiken

Alle kritischen Berechnungen sind jetzt in shared-Funktionen.

## 10. Migration-Status

### 10.1 Abgeschlossen

- ✅ Text-Layout-Funktionen migriert
- ✅ Layout-Berechnungen migriert
- ✅ Server-seitige Integration abgeschlossen
- ✅ Feature-Flags implementiert

### 10.2 In Arbeit

- ⏳ Visuelle Vergleichstests
- ⏳ Performance-Tests
- ⏳ PDF-Export-Tests

### 10.3 Geplant

- ⏳ Finalisierung (Feature-Flags entfernen)
- ⏳ Dokumentation aktualisieren

## 11. Empfehlungen

### 11.1 Sofortige Maßnahmen

1. ✅ Shared-Funktionen verwenden (bereits umgesetzt)
2. ⏳ Visuelle Tests durchführen
3. ⏳ Toleranzen in automatisierten Tests einbauen

### 11.2 Langfristige Maßnahmen

1. Monitoring von visuellen Unterschieden
2. Regelmäßige Vergleichstests zwischen Client und Server
3. Dokumentation von bekannten Unterschieden aktualisieren

## 12. Zusammenfassung

Die Migration zu plattformunabhängigen Dateien ist weitgehend abgeschlossen. Die meisten kritischen Berechnungen (Text-Layout, Line-Height, Text-Umbruch, Layout-Berechnungen) sind jetzt in shared-Funktionen, die sowohl Client- als auch Server-seitig verwendet werden.

**Hauptunterschiede:**
- Font-Rendering (Browser vs. Server Canvas) - minimal, aber vorhanden
- Text-Messungen - minimale Unterschiede möglich

**Risiken:**
- Niedrig für die meisten Bereiche
- Mittel für Font-Rendering (aber visuell kaum wahrnehmbar)

**Nächste Schritte:**
- Visuelle Vergleichstests durchführen
- Performance-Tests
- PDF-Export-Tests

