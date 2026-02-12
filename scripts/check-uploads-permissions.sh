#!/bin/bash

# =========================================================
# Prüfskript: Dateiberechtigungen für Uploads
# Gibt alle relevanten Infos aus, um die Sicherheit zu bewerten.
# Ausführen: bash scripts/check-uploads-permissions.sh
# =========================================================

set -e

PROJECT_DIR="${PROJECT_DIR:-/var/www/fb_konva_new}"
UPLOADS_DIR="${PROJECT_DIR}/uploads"

echo "=============================================="
echo "  Prüfung: Dateiberechtigungen für Uploads"
echo "=============================================="
echo ""

# UPLOADS_DIR aus .env lesen, falls vorhanden
if [ -f "${PROJECT_DIR}/server/.env" ]; then
    ENV_UPLOADS=$(grep "^UPLOADS_DIR=" "${PROJECT_DIR}/server/.env" 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -n "$ENV_UPLOADS" ]; then
        if [[ "$ENV_UPLOADS" == /* ]]; then
            UPLOADS_DIR="$ENV_UPLOADS"
        else
            UPLOADS_DIR="${PROJECT_DIR}/${ENV_UPLOADS}"
        fi
        echo "UPLOADS_DIR aus .env: ${UPLOADS_DIR}"
    else
        echo "UPLOADS_DIR (Standard): ${UPLOADS_DIR}"
    fi
else
    echo "UPLOADS_DIR (Standard): ${UPLOADS_DIR}"
fi
echo ""

# --- 1. Existenz prüfen ---
echo "--- 1. Existenz des Uploads-Verzeichnisses ---"
if [ -d "$UPLOADS_DIR" ]; then
    echo "OK: Verzeichnis existiert"
else
    echo "FEHLER: Verzeichnis existiert nicht!"
    exit 1
fi
echo ""

# --- 2. Rechte und Besitzer ---
echo "--- 2. Rechte und Besitzer (uploads/) ---"
ls -la "$UPLOADS_DIR"
echo ""

echo "--- 3. Rechte und Besitzer (uploads/images/) ---"
if [ -d "${UPLOADS_DIR}/images" ]; then
    ls -la "${UPLOADS_DIR}/images"
    # Beispiel-Datei in images/{user_id}/ falls vorhanden
    SAMPLE=$(find "${UPLOADS_DIR}/images" -type f 2>/dev/null | head -1)
    if [ -n "$SAMPLE" ]; then
        echo ""
        echo "Beispiel-Datei: $SAMPLE"
        ls -la "$SAMPLE"
    fi
else
    echo "Hinweis: uploads/images/ existiert noch nicht"
fi
echo ""

echo "--- 4. Rechte aller Unterverzeichnisse und Dateien ---"
echo "(find -exec ls -ld für jeden Eintrag)"
find "$UPLOADS_DIR" -exec ls -ld {} \; 2>/dev/null | head -50
echo "(ggf. mehr Einträge – erste 50 gezeigt)"
echo ""

# --- 5. Numerische Rechte (z.B. 755, 770, 660) ---
echo "--- 5. Numerische Rechte (z.B. 755, 770, 660) ---"
for dir in "$UPLOADS_DIR" "${UPLOADS_DIR}/images" "${UPLOADS_DIR}/profile_pictures" "${UPLOADS_DIR}/pdf-exports"; do
    [ -d "$dir" ] || continue
    perms=$(stat -c "%a" "$dir" 2>/dev/null) || perms=$(stat -f "%A" "$dir" 2>/dev/null) || perms="?"
    echo "  $dir: $perms"
done
echo ""

# --- 6. Node/PM2-Prozess ---
echo "--- 6. Läuft der Node-Server (PM2)? ---"
if command -v pm2 &>/dev/null; then
    pm2 list 2>/dev/null || echo "PM2 nicht erreichbar"
    echo ""
    echo "--- 7. Nutzer des Node-Prozesses ---"
    NODE_PID=$(pgrep -f "freundebuch-server|node.*server" | head -1)
    if [ -n "$NODE_PID" ]; then
        echo "Prozess gefunden (PID: $NODE_PID):"
        ps -o user,group,pid,cmd -p "$NODE_PID" 2>/dev/null || ps aux | grep "$NODE_PID" | grep -v grep
    else
        echo "Kein Node-Prozess gefunden (evtl. Server nicht gestartet)"
    fi
else
    echo "PM2 nicht installiert/gefunden"
    NODE_PID=$(pgrep -f "node.*server" | head -1)
    if [ -n "$NODE_PID" ]; then
        echo "Node-Prozess gefunden (PID: $NODE_PID):"
        ps -o user,group,pid,cmd -p "$NODE_PID" 2>/dev/null || ps aux | grep "$NODE_PID" | grep -v grep
    fi
fi
echo ""

# --- 8. Gruppenmitgliedschaft ---
echo "--- 8. Gruppen des aktuellen Nutzers ---"
echo "Aktueller Nutzer: $(whoami)"
groups
echo ""

# --- 9. Test-Schreibzugriff ---
echo "--- 9. Schreibzugriff-Test ---"
TEST_FILE="${UPLOADS_DIR}/.perm_test_$$"
if touch "$TEST_FILE" 2>/dev/null; then
    echo "OK: Schreibzugriff möglich"
    rm -f "$TEST_FILE"
else
    echo "FEHLER: Kein Schreibzugriff (z.B. als root ausführen)"
fi
echo ""

echo "=============================================="
echo "  Ende der Prüfung"
echo "=============================================="
echo ""
echo "Kopiere die gesamte Ausgabe und sende sie z.B. an Cursor/AI,"
echo "um die Berechtigungen bewerten und verbessern zu lassen."
