# Phase 7.2: Circle Element Size - Fix angewendet

## Problem identifiziert

**Gemessener Durchmesser:** ~145 Pixel  
**Erwarteter Durchmesser:** 150 Pixel (2 × radius = 2 × 75)

**Abweichung:** ~5 Pixel zu klein

## Ursache

Rough.js `rc.circle()` erwartet den **Radius** als dritten Parameter, nicht den Durchmesser. Der Code übergab aber `radius * 2` (Durchmesser), was zu einem zu großen Wert führte, den Rough.js dann möglicherweise anders interpretiert hat.

## Fix angewendet

**Geänderte Dateien:**

1. **`client/src/utils/themes.ts`** (Zeile 90)
   - **Vorher:** `rc.circle(..., radius * 2, {...})`
   - **Nachher:** `rc.circle(..., radius, {...})`

2. **`shared/rendering/render-element.js`** (Zeile 439)
   - **Vorher:** `rc.circle(..., radius * 2, {...})`
   - **Nachher:** `rc.circle(..., radius, {...})`

## Erwartetes Ergebnis

Nach dem Fix sollte der Circle-Durchmesser genau 150 Pixel betragen (statt ~145 Pixel).

## Nächster Schritt

**Bundle wurde neu erstellt.** Bitte Test-PDF erneut generieren:

```powershell
cd server
node scripts/test-pdf-debug.js
```

**Erwartete Änderung:**
- Circle-Durchmesser sollte jetzt genau 150 Pixel sein
- Keine Abweichung mehr von ~5 Pixel

