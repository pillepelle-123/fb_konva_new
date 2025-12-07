# Phase 7.2: Visuelle PDF-Prüfung - Anleitung

## 📄 PDF-Pfad

**PDF-Datei:** `server/uploads/pdf-exports/999/999.pdf`

## 🚀 Schnellstart

### Schritt 1: PDF-Analyse ausführen

```bash
cd server
node scripts/check-pdf-visual.js
```

Dies zeigt:
- ✅ Ob das PDF existiert
- 📄 Anzahl der Seiten
- 📏 Dimensionen jeder Seite
- 📋 Prüfungs-Checkliste

### Schritt 2: PDF öffnen

**Windows:**
```bash
# Im Explorer öffnen
explorer server\uploads\pdf-exports\999\999.pdf

# Oder direkt im Standard-PDF-Viewer
start server\uploads\pdf-exports\999\999.pdf
```

**Oder manuell:**
- Navigieren Sie zu: `server/uploads/pdf-exports/999/`
- Öffnen Sie: `999.pdf`

## 📋 Detaillierte Prüfungs-Checkliste

### Seite 1: Alle Elementtypen

#### 1. Rect mit Rough Theme
- **Erwartet:** Rotes Rechteck (200x150px) mit handgezeichnetem, unregelmäßigem Rand
- **Position:** Links oben (x: 50, y: 50)
- **Prüfung:**
  - [ ] Rechteck ist sichtbar
  - [ ] Rand ist handgezeichnet (nicht glatt)
  - [ ] Farbe ist rot (#FF0000)
  - [ ] Rand ist schwarz (#000000)

#### 2. Circle mit Rough Theme
- **Erwartet:** Grüner Kreis (150x150px) mit handgezeichnetem, unregelmäßigem Rand
- **Position:** Rechts oben (x: 300, y: 50)
- **Prüfung:**
  - [ ] Kreis ist sichtbar
  - [ ] Rand ist handgezeichnet (nicht glatt)
  - [ ] Farbe ist grün (#00FF00)
  - [ ] Rand ist schwarz (#000000)

#### 3. QnA Inline mit Ruled Lines
- **Erwartet:** QnA Inline Element mit horizontalen Linien (Ruled Lines)
- **Position:** Links (x: 50, y: 250)
- **Größe:** 400x300px
- **Text:** "Was ist dein Name?" / "Mein Name ist Test"
- **Prüfung:**
  - [ ] QnA Inline ist sichtbar
  - [ ] **Ruled Lines sind sichtbar** (horizontale Linien)
  - [ ] Linien sind handgezeichnet (Rough Theme)
  - [ ] Text ist lesbar
  - [ ] Frage und Antwort sind getrennt

#### 4. QnA Inline mit Background Fill
- **Erwartet:** QnA Inline Element mit weißem Hintergrund
- **Position:** Links (x: 50, y: 250) - **Gleiches Element wie #3**
- **Prüfung:**
  - [ ] **Weißer Hintergrund ist sichtbar**
  - [ ] Hintergrund hat Opacity 0.9 (leicht transparent)
  - [ ] Hintergrund ist hinter dem Text

#### 5. Shape mit höherem Z-Index
- **Erwartet:** Blaues Rechteck (100x100px) das über QnA Inline liegt
- **Position:** (x: 100, y: 300)
- **Z-Index:** 3 (höher als QnA Inline mit Z-Index 0)
- **Prüfung:**
  - [ ] Shape ist sichtbar
  - [ ] **Shape liegt ÜBER QnA Inline** (Z-Index-Sortierung)
  - [ ] Farbe ist blau (#0000FF)
  - [ ] Shape überlappt QnA Inline korrekt

#### 6. Image Background
- **Erwartet:** Image Background sollte fehlschlagen (CORS-Problem)
- **Prüfung:**
  - [ ] **Kein Bild sichtbar** (erwartet, da URL nicht existiert)
  - [ ] Seite hat keinen Image-Hintergrund
  - [ ] CORS-Fehler wurde in Logs erkannt

### Seite 2: Vergleichselemente

#### 7. QnA Inline OHNE Ruled Lines
- **Erwartet:** QnA Inline Element OHNE horizontale Linien
- **Position:** Links oben (x: 50, y: 50)
- **Text:** "Test Frage" / "Test Antwort"
- **Prüfung:**
  - [ ] QnA Inline ist sichtbar
  - [ ] **KEINE Ruled Lines sichtbar** (im Vergleich zu Seite 1)
  - [ ] Text ist lesbar

#### 8. QnA Inline OHNE Background Fill
- **Erwartet:** QnA Inline Element OHNE Hintergrund
- **Position:** Links oben (x: 50, y: 50) - **Gleiches Element wie #7**
- **Prüfung:**
  - [ ] **KEIN Hintergrund sichtbar** (im Vergleich zu Seite 1)
  - [ ] Text ist direkt auf Page-Hintergrund

#### 9. Color Background mit Opacity
- **Erwartet:** Grauer Page-Hintergrund mit Opacity 0.5 (halbtransparent)
- **Prüfung:**
  - [ ] **Hintergrund ist halbtransparent** (Opacity < 1)
  - [ ] Farbe ist grau (#F0F0F0)
  - [ ] Transparenz ist sichtbar

## 🔍 Problem-Identifikation

### Wenn Rough Theme NICHT funktioniert:
- **Symptom:** Rect/Circle haben glatte, gerade Ränder (nicht handgezeichnet)
- **Mögliche Ursache:** Rough.js wird nicht geladen oder `roughInstance` ist null
- **Zu prüfen:** Ist `roughInstance` vorhanden?

### Wenn Ruled Lines NICHT funktioniert:
- **Symptom:** QnA Inline auf Seite 1 hat keine horizontalen Linien
- **Mögliche Ursache:** `element.ruledLines` ist nicht `true` oder `renderRuledLines` wird nicht aufgerufen
- **Zu prüfen:** Ist `ruledLinesEnabled` true?

### Wenn Background Fill NICHT funktioniert:
- **Symptom:** QnA Inline auf Seite 1 hat keinen weißen Hintergrund
- **Mögliche Ursache:** `backgroundEnabled` ist nicht gesetzt oder `showBackground` ist false
- **Zu prüfen:** Ist `showBackground` true?

### Wenn Z-Index NICHT funktioniert:
- **Symptom:** Shape liegt unter QnA Inline (sollte darüber liegen)
- **Mögliche Ursache:** Element-Sortierung ist falsch
- **Zu prüfen:** Wird Z-Index korrekt sortiert?

## 📝 Dokumentation

**Dokumentieren Sie alle gefundenen Probleme:**

1. **Problem beschreiben:**
   - Was wird erwartet?
   - Was wird tatsächlich angezeigt?

2. **Screenshot erstellen** (optional):
   - Markieren Sie das Problem
   - Speichern Sie als `problem-1.png`, etc.

3. **Priorität setzen:**
   - Hoch: Funktioniert gar nicht
   - Mittel: Funktioniert teilweise
   - Niedrig: Kosmetisches Problem

## ✅ Erfolgs-Kriterien

**Alle Tests bestehen, wenn:**

- ✅ Rect/Circle haben handgezeichnete Ränder (Rough Theme)
- ✅ QnA Inline auf Seite 1 hat Ruled Lines
- ✅ QnA Inline auf Seite 1 hat weißen Hintergrund
- ✅ Shape liegt über QnA Inline (Z-Index)
- ✅ QnA Inline auf Seite 2 hat KEINE Ruled Lines
- ✅ QnA Inline auf Seite 2 hat KEINEN Hintergrund
- ✅ Page-Hintergrund auf Seite 2 ist halbtransparent

## 🎯 Nächste Schritte

Nach der visuellen Prüfung:

1. **Probleme dokumentieren**
2. **Prioritäten setzen**
3. **Gezielt beheben** (basierend auf visueller Analyse)

