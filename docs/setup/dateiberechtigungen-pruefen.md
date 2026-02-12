# Anleitung: Serverseitige Dateiberechtigungen prüfen und verbessern

Diese Anleitung richtet sich an Anfänger und erklärt Schritt für Schritt, wie du die Berechtigungen für den Uploads-Ordner prüfst und verbesserst.

## Warum sind Berechtigungen wichtig?

Der Ordner `uploads/images/` enthält persönliche Bilder der Nutzer. Wenn die Berechtigungen zu offen sind, könnten andere Prozesse oder Nutzer auf dem Server diese Dateien lesen. Die Empfehlung: **Nur der Server-Prozess** (und ggf. Admins) soll lesen und schreiben können.

---

## Schritt 1: Prüfskript auf den Server kopieren

Das Skript liegt im Projekt unter `scripts/check-uploads-permissions.sh`.

1. Stelle sicher, dass dein Projekt per Git auf dem Server aktuell ist (z.B. nach `git pull`).
2. Oder kopiere das Skript manuell auf den Server.

---

## Schritt 2: Skript ausführen

1. Per SSH auf den Server verbinden:
   ```bash
   ssh dein-nutzer@dein-server.de
   ```

2. In das Projektverzeichnis wechseln:
   ```bash
   cd /var/www/fb_konva_new
   ```
   *(Falls dein Projekt woanders liegt, den Pfad anpassen.)*

3. Skript ausführbar machen (nur einmal nötig):
   ```bash
   chmod +x scripts/check-uploads-permissions.sh
   ```

4. Skript ausführen:
   ```bash
   bash scripts/check-uploads-permissions.sh
   ```
   
   Wenn das Projekt woanders liegt:
   ```bash
   PROJECT_DIR=/pfad/zu/fb_konva_new bash scripts/check-uploads-permissions.sh
   ```

5. **Die komplette Ausgabe kopieren** (vom ersten `===` bis zum Ende).

---

## Schritt 3: Ausgabe an Cursor/AI senden

Füge die kopierte Ausgabe in eine Nachricht ein (z.B. an Cursor) und frage:

> „Bitte prüfe die Dateiberechtigungen anhand dieser Ausgabe und gib mir konkrete Empfehlungen oder Befehle zur Verbesserung.“

---

## Schritt 4: Berechtigungen verbessern (wenn empfohlen)

Typische Empfehlung: **770** für Verzeichnisse und **660** für Dateien. Das bedeutet:
- **Owner** (z.B. root): lesen, schreiben, ausführen
- **Group** (z.B. www-data): lesen, schreiben, ausführen
- **Andere**: kein Zugriff

### Befehle (als root/sudo):

```bash
# Projekt-Pfad anpassen
UPLOADS_DIR="/var/www/fb_konva_new/uploads"

# Oder aus .env lesen, falls UPLOADS_DIR dort gesetzt ist
# (siehe deploy_fb.sh für die Logik)

# Verzeichnisse: 770
sudo find "$UPLOADS_DIR" -type d -exec chmod 770 {} \;

# Dateien: 660
sudo find "$UPLOADS_DIR" -type f -exec chmod 660 {} \;
```

### Besitzer prüfen

Der Besitzer sollte `root` (oder dein Deploy-User) und die Gruppe `www-data` sein:

```bash
sudo chown -R root:www-data /var/www/fb_konva_new/uploads
```

---

## Schritt 5: Nach dem Deployment prüfen

Das Deploy-Skript `deploy_fb.sh` setzt die Berechtigungen bereits automatisch. Nach einem Deployment kannst du erneut das Prüfskript ausführen, um zu kontrollieren, ob alles stimmt.

---

## Kurzreferenz: Bedeutung der Zahlen

| Zahl | Bedeutung | Rechte |
|------|------------|--------|
| 7 | Vollzugriff | lesen + schreiben + ausführen |
| 6 | Lesen + Schreiben | lesen + schreiben |
| 5 | Lesen + Ausführen | lesen + ausführen (Traversieren) |
| 4 | Nur lesen | lesen |
| 0 | Kein Zugriff | - |

**Beispiel 775:** Owner=7, Group=7, Others=5 → „Others“ können lesen und traversieren (zu offen für Uploads).  
**Beispiel 770:** Owner=7, Group=7, Others=0 → nur Owner und Group haben Zugriff.

---

## Häufige Fragen

**F: Das Skript meldet „Kein Schreibzugriff“.**  
A: Führe es mit `sudo` aus, oder wechsle vorher mit `su` zu root.

**F: Wo liegt mein Projekt auf dem Server?**  
A: Typisch unter `/var/www/fb_konva_new` oder `/home/...`. Siehe `deploy_fb.sh` – dort steht `PROJECT_DIR`.

**F: Läuft der Server unter root oder www-data?**  
A: Das Prüfskript zeigt unter „Nutzer des Node-Prozesses“, wer den Server ausführt. Der Nutzer muss Owner oder Mitglied der Gruppe (z.B. www-data) des Uploads-Ordners sein.
