# Sicherheits-Audit: Status & offene Punkte

## Was bereits umgesetzt wurde (ohne weiteren Input)

| Bereich | Umsetzung |
|---------|-----------|
| **Bilder** | Base64 im PDF-Export, Book-Friend-Zugriff, Path-Traversal-Schutz, Magic-Bytes, Rate-Limit, UUID-Dateinamen |
| **PDF-Exports** | Direktzugriff auf `/uploads/pdf-exports` blockiert (403), Path-Traversal beim Download/Delete |
| **Dateiberechtigungen** | 770/660 für uploads (Deploy-Skript) |
| **PDF-Export-Route** | Fehlende Route `GET /api/pdf-exports/recent` ergänzt (für Notifications) |

---

## Was deine Infos braucht

### 1. Nginx-Konfiguration

**Frage:** Liefert Nginx `/uploads` direkt aus (z.B. mit `location /uploads` und `root`/`alias`)?  
Wenn ja, würde die Anfrage **gar nicht** an Node.js gehen – unsere Express-Blocks würden nicht greifen.

**Skript:** `bash scripts/collect-server-security-info.sh`  
**Ausgabe:** Nginx-Configs – daraus kann geprüft werden, ob `/uploads` von Nginx ausgeliefert wird.

### 2. Profile Pictures (optional)

**Status:** `/uploads/profile_pictures/{user_id}/{datei}` wird aktuell von `express.static` ausgeliefert – also ohne Auth.  
**Frage:** Sollen Profilbilder nur für eingeloggte Nutzer sichtbar sein, oder ist öffentlicher Zugriff gewollt?  
- Wenn schützen: analog zu `/uploads/images` blockieren und eigene API-Route mit Auth nutzen.

---

## Skript ausführen

```bash
cd /var/www/fb_konva_new
bash scripts/collect-server-security-info.sh
```

Die komplette Ausgabe kopieren und hier posten. Daraus können wir prüfen:
- ob Nginx `/uploads` direkt ausliefert
- ob die Express-Blocks greifen (lokaler curl-Test)
- ob die Nginx-Konfiguration angepasst werden muss
