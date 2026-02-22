# Debug: Background Images / Stickers laden fehlschlägt

## Problem

Hintergrundbilder oder Sticker laden nicht (403 oder 404).

## Schnellfix für lokale Entwicklung

Wenn der Referer-Check blockiert (403), in `server/.env`:

```
ALLOW_NO_REFERER_IN_DEV=1
```

Damit werden Requests ohne Referer in der Entwicklung zugelassen. **Nicht in Produktion verwenden.**

**Hinweis:** Der Browser sendet bei `img.src` manchmal keinen Referer-Header. Mit dieser Option werden solche Requests in der Entwicklung zugelassen.
