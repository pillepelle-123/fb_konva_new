# ICC Profile Verzeichnis

Dieses Verzeichnis enthält ICC-Farbprofile für den PDF-Export.

## Verfügbare Profile

### ISO Coated v2 300% ECI Profil (empfohlen)

Für CMYK-Exporte mit ISO Coated v2 300% Profil (Standard für europäischen Offsetdruck, 300% TAC):

1. Laden Sie das Profil von der ECI-Website herunter:
   - URL: https://www.eci.org/doku.php?id=de:downloads
   - Profil: ISOcoated_v2_300_eci.icc

2. Speichern Sie die Datei hier als:
   - `ISOcoated_v2_300_eci.icc`

### FOGRA 39 (Coated FOGRA39)

Für CMYK-Exporte mit FOGRA 39 Profil (empfohlen für Prodigi Softcover-Fotobücher):

1. Laden Sie das Profil von der FOGRA-Website herunter:
   - URL: https://www.fogra.org/en/fogra-characterization-data.html
   - Profil: ISOcoated_v2_eci.icc (FOGRA 39 ist identisch mit ISO Coated v2 ECI)
   - ODER verwenden Sie das FOGRA 39 Profil von Adobe:
     - URL: https://www.adobe.com/support/downloads/detail.jsp?ftpID=3681
     - Profil: CoatedFOGRA39.icc

2. Speichern Sie die Datei hier als:
   - `CoatedFOGRA39.icc`

**Hinweis:** FOGRA 39 und ISO Coated v2 ECI sind technisch identisch. Beide Profile basieren auf ISO 12647-2:2004. Für Prodigi wird FOGRA 39 explizit empfohlen.

## Verwendung

Die Profile werden automatisch vom PDF-Export-Service verwendet, wenn:
- `useCMYK: true` gesetzt ist
- Das entsprechende Profil im `iccProfile` Parameter ausgewählt wurde

## Weitere Profile

Weitere ICC-Profile können hier abgelegt werden, wenn sie in Zukunft benötigt werden.

