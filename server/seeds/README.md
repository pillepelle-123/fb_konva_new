# Database Seeds

Dieser Ordner enthält SQL-Dateien mit **Test- und Initial-Daten** für die Datenbank.

## ⚠️ Wichtig: Seeds ≠ Migrations

- **Seeds** = Datenbefüllung (INSERT-Statements für Dev/Testing)
- **Migrations** = Schema-Änderungen (CREATE/ALTER/DROP für alle Umgebungen)

**Seeds sollten NIEMALS in Production ausgeführt werden!**

## Wann verwendet man Seeds?

✅ **Verwenden:**
- Lokale Entwicklungsumgebung einrichten
- Test-Datenbank befüllen
- Demo-/Staging-Daten für Präsentationen
- Nach `database.sql` Baseline-Setup

❌ **NICHT verwenden:**
- In Production
- Für echte User-Daten
- Für Schema-Änderungen (→ nutze Migrations)

## Verfügbare Seeds

### `database_seed.sql`
Haupt-Seed-Datei mit:
- Admin User & Test-User (Peter)
- Color Palettes (1-36)
- Themes, Layouts
- Sticker-/Background-Categories
- Demo-Stickers und Background-Images

**Verwendung:**
```bash
# Aus Root-Verzeichnis
npm run db:seed

# Oder direkt mit psql
psql $DATABASE_URL -f server/seeds/database_seed.sql
```

## Workflow: Neue Datenbank einrichten

```bash
# 1. Schema erstellen (Baseline)
psql $DATABASE_URL -f server/migrations/database.sql

# 2. Migrationen ausführen
npm run migrate:up

# 3. Seeds einspielen (nur Dev/Test!)
npm run db:seed
```

## Seeds aktualisieren

Seeds können **jederzeit überschrieben** werden (im Gegensatz zu Migrations):

```bash
# Warnung: Löscht existierende Daten!
# TRUNCATE in database_seed.sql entfernt alle referenzierten Daten
npm run db:seed
```

**Best Practice:** Seeds idempotent halten mit `ON CONFLICT DO NOTHING` oder explizitem `TRUNCATE`.

## Neue Seeds hinzufügen

Für spezielle Dev-Szenarien kannst du weitere Seed-Dateien anlegen:

```
server/seeds/
  ├── database_seed.sql          # Basis-Seeds
  ├── dev_conversations.sql      # Extra: Chat-Test-Daten
  ├── demo_friendbooks.sql       # Extra: Demo-Freundebücher
  └── README.md
```

Dann in `package.json`:
```json
"scripts": {
  "db:seed:conversations": "psql $DATABASE_URL -f server/seeds/dev_conversations.sql"
}
```

## Security-Hinweise

- ⚠️ Seeds enthalten **Plaintext-Passwörter** (z.B. `admin123`)
- Seeds sollten **nie in Production** deployed werden
- `.gitignore` prüfen, falls sensible Test-Daten entstehen

## Siehe auch

- [AGENTS.md](../../AGENTS.md) - Migration Policy
- [docs/maintainers/migration-policy.md](../../docs/maintainers/migration-policy.md) - Migrations Best Practices
- [server/migrations/](../migrations/) - Schema Migrations
