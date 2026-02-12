# Nginx: Uploads-Sicherheit – nötige Anpassung

## Problem

Die Nginx-Config liefert `/uploads` aus. Ohne Block würden PDFs und Bilder öffentlich zugänglich sein.

## Lösung: Block direkt in Nginx

Die geschützten Pfade (`/uploads/images` und `/uploads/pdf-exports`) werden in Nginx mit 403 blockiert. Der Rest von `/uploads` wird an Node weitergeleitet.

## Änderung in der Nginx-Config

**Datei:** `/etc/nginx/sites-enabled/freundebuch`

**Ersetze den bestehenden `location /uploads`-Block** durch:

```nginx
    # Block: Geschützte Uploads (nur über API mit Auth)
    location /uploads/images {
        return 403;
    }
    location /uploads/pdf-exports {
        return 403;
    }
    # Übrige Uploads (background-images, stickers, etc.) an Node
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

**Hinweis:** Nginx wählt die spezifischste `location`. `/uploads/images` und `/uploads/pdf-exports` werden zuerst geprüft und liefern 403. Alle anderen `/uploads/*` gehen an Node.

## Nach der Änderung

```bash
sudo nginx -t          # Config prüfen
sudo systemctl reload nginx
```

## Prüfen

```bash
# Sollte 403 liefern (blockiert)
curl -I https://deine-domain.de/uploads/pdf-exports/

# Sollte 403 liefern (blockiert)
curl -I https://deine-domain.de/uploads/images/

# Sollte 200 liefern (öffentliche Templates)
curl -I https://deine-domain.de/uploads/background-images/
```
