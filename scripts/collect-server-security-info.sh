#!/bin/bash

# =========================================================
# Sammelt Infos für Sicherheits-Review
# Ausgabe an Cursor/AI senden für Analyse
# Ausführen: bash scripts/collect-server-security-info.sh
# =========================================================

echo "=============================================="
echo "  Server-Sicherheits-Info (für Cursor/AI)"
echo "=============================================="
echo ""

# --- 1. Nginx-Konfiguration ---
echo "--- 1. Nginx: Site-Configs mit /uploads oder /api ---"
echo ""
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
  [ -f "$f" ] || continue
  if grep -q -E "uploads|location|proxy_pass" "$f" 2>/dev/null; then
    echo "=== Datei: $f ==="
    grep -n -E "location|uploads|proxy_pass|root|alias" "$f" 2>/dev/null || true
    echo ""
  fi
done

echo "--- 2. Nginx: Vollständige Config (falls möglich) ---"
echo ""
if [ -r /etc/nginx/sites-enabled/default ]; then
  echo "=== /etc/nginx/sites-enabled/default ==="
  cat /etc/nginx/sites-enabled/default 2>/dev/null | head -150
elif [ -d /etc/nginx/conf.d ]; then
  for f in /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] && echo "=== $f ===" && cat "$f" 2>/dev/null | head -80
  done
fi
echo ""

# --- 3. Prüfung: Wird /uploads von Nginx direkt ausgeliefert? ---
echo "--- 3. Nginx: Alle location-Blöcke ---"
echo ""
grep -r -n "location" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -v "#" || echo "(Keine oder keine Leserechte)"
echo ""

# --- 4. Projekt-Pfad und UPLOADS_DIR ---
echo "--- 4. Projekt & Uploads ---"
PROJECT_DIR="${PROJECT_DIR:-/var/www/fb_konva_new}"
 echo "PROJECT_DIR: $PROJECT_DIR"
if [ -f "${PROJECT_DIR}/server/.env" ]; then
  echo "UPLOADS_DIR aus .env:"
  grep "UPLOADS_DIR" "${PROJECT_DIR}/server/.env" 2>/dev/null || echo "(nicht gesetzt)"
else
  echo "server/.env nicht gefunden"
fi
echo ""

# --- 5. Uploads-Berechtigungen (Kurz) ---
echo "--- 5. Uploads-Berechtigungen ---"
UPLOADS_DIR="${PROJECT_DIR}/uploads"
[ -f "${PROJECT_DIR}/server/.env" ] && {
  ENV_UPLOADS=$(grep "^UPLOADS_DIR=" "${PROJECT_DIR}/server/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
  [ -n "$ENV_UPLOADS" ] && [[ "$ENV_UPLOADS" == /* ]] && UPLOADS_DIR="$ENV_UPLOADS"
}
ls -la "$UPLOADS_DIR" 2>/dev/null || echo "Uploads nicht gefunden"
echo ""

# --- 6. Test: Erreichbarkeit von /uploads (lokal) ---
echo "--- 6. Lokaler HTTP-Test (optional) ---"
echo "Prüfe ob Node/Express auf Port 5000 läuft..."
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/uploads/pdf-exports/ 2>/dev/null | grep -q "403"; then
  echo "OK: /uploads/pdf-exports/ liefert 403 (blockiert)"
elif curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/uploads/pdf-exports/ 2>/dev/null | grep -q "200"; then
  echo "WARNUNG: /uploads/pdf-exports/ liefert 200 (öffentlich!)"
else
  echo "Hinweis: curl-Test nicht auswertbar (Server nicht erreichbar oder anderer Status)"
fi

if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/uploads/images/ 2>/dev/null | grep -q "403"; then
  echo "OK: /uploads/images/ liefert 403 (blockiert)"
else
  echo "Hinweis: /uploads/images/ Status unklar"
fi
echo ""

# --- 7. OS & Nginx-Version ---
echo "--- 7. System ---"
echo "OS: $(uname -a 2>/dev/null)"
echo "Nginx: $(nginx -v 2>&1 || echo 'nicht installiert')"
echo ""

echo "=============================================="
echo "  Ende – Gesamte Ausgabe kopieren und an Cursor senden"
echo "=============================================="
