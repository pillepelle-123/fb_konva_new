# Bild-Speicherung (Lokal)

Alle Bilder werden lokal gespeichert.

## Aktuelle Konfiguration

Bilder werden im Ordner `uploads/images/{user_id}/` gespeichert (oder unter dem Pfad aus `UPLOADS_DIR`).

## Umgebungsvariablen

```env
# Optional: Eigener Pfad für Uploads (Standard: root/uploads)
UPLOADS_DIR=/pfad/zu/uploads
```

## Features
- ✅ Bilder werden lokal gespeichert
- ✅ Automatische Thumbnail-Generierung (200x200px)
- ✅ Bereinigung beim Löschen

## Dateistruktur

```
uploads/
├── images/
│   ├── {user_id}/
│   │   ├── image_{user_id}_{date}_{time}.jpg
│   │   ├── image_{user_id}_{date}_{time}_thumb.jpg
│   │   └── ...
```
