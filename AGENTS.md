# KI-Agent Instruktionen für dieses Projekt

Dieses Dokument definiert verbindliche Regeln für alle KI-Coding-Agents (GitHub Copilot, Cursor, Claude, etc.) beim Arbeiten an diesem Projekt.

## 1. Datenbankänderungen: Migrations-First

### MUST: Migrations, nicht manuelle SQL
- **JEDE** Schema-Änderung (CREATE, ALTER, DROP auf Tables/Columns/Indexes) → neue Migration
- Keine direkten Edits in `server/migrations/database.sql`
- Keine Ad-hoc-SQL in README, Docs oder lose SQL-Dateien

### Wie: Migration-Workflow
```bash
# 1. Neue Migration anlegen (node-pg-migrate)
npm run migrate:create --name "was_genau_geaendert_wird"

# 2. UP-Migration befüllen (YYYYMMDDHHmmss__was_genau_geaendert_wird.sql)
# 3. Ggf. DOWN-Migration (optional lokal, Prod forward-only)
# 4. Tested lokal mit `npm run migrate:up`
# 5. Committed mit verständlicher Commit-Message

npm run migrate:up
```

### Migration-Dateinamen (Konvention)
Format: `YYYYMMDDHHmmss__kurze_beschreibung.sql`

**Beispiele:**
- `20260308090000__add_mfa_to_users.sql`
- `20260308091500__create_user_blocks_table.sql`
- `20260308093000__backfill_archived_field_books.sql`

### Regeln für Migrations-Inhalt
- **Transaktional:** Alle DML/DDL in einer Transaktion (Standard in SQL-Dateien)
- **Idempotent für UP:** `IF NOT EXISTS`, `IF EXISTS` wo sinnvoll
- **Kurz & fokussiert:** Eine Migration = ein Thema (z.B. "eine Tabelle", "ein Feld", "ein Index")
- **Riskante Drops (Spalten/Tabellen):**
  - Erst deprecatedMarkierung + neue Default-Migration
  - 1–2 Minor-Versionen später dann entfernen
  - Dokumentation mit Deprecation-Hinweis

### Beispiel-Migration (DO)
```sql
-- UP: Create missing schema table
BEGIN;

CREATE TABLE IF NOT EXISTS schema_version (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_version_executed ON schema_version(executed_at);

INSERT INTO schema_version (filename) VALUES ('20260308090000__init_schema_version_table.sql');

COMMIT;

-- DOWN
BEGIN;
DROP TABLE IF EXISTS schema_version CASCADE;
COMMIT;
```

---

## 2. `database.sql` ist ein Snapshot, nicht die Quelle der Wahrheit

- `database.sql` wird **nur zur Baseline/Bootstrap** genutzt (neue DBs von Null)
- `database.sql` wird **monatlich oder nach Major-Release** aus echter DB regeneriert
  ```bash
  npm run migrate:snapshot  # (noch zu konfigurieren)
  ```
- Edits in `database.sql` sind **nur automatisiert** (via Snapshot-Skript), nicht manuell

**Warum:** Kleine Edits in `database.sql` und Migrationen getrennt zu halten, führt zu Drift und Bugs.

---

## 3. Code-Changes, die Schema betreffen

Falls Agent Code (z.B. Validatoren, Services) ändert, der ein Schema-Update erfordert:

1. Agent erkennt Needed: *"Spalte X wird vom Code benötigt, existiert aber nicht"*
2. Agent erstellt **zuerst die Migration**
3. Agent aktualisiert dann Code
4. Hinweis in Commit: `"Code: validate X. Migration: add column X"`

---

## 4. TypeScript Types ↔ Database Schema

- **Types** in `shared/types/` oder `client/src/types/` definieren Interface-Kontrakte
- **Schema** in Migrationen definieren
- Beide müssen **syncron sein**, aber sind Quellen-Code, keine Auto-Generierung
- Update-Regel: Type-Change → Migration nötig? → Dann migration first

---

## 5. CI/CD und Qualität

### Pre-Commit (lokal, falls vorhanden)
- ✅ Neue Migrationen müssen eindeutige Namen haben
- ✅ Migrationen müssen lokal laufen ohne Fehler

### CI in PR
- ✅ Keine direkten Edits in `server/migrations/database.sql` (außer Snapshots)
- ✅ Keine DROP TABLE ohne explizite Safe-Markierung
- ✅ Neue Migrations-Dateien existieren für alle Schema-Änderungen

### Deployment-Prozess
```bash
# Pre-Deployment: alle Migrationen applied
npm run migrate:status          # Zeigt: welche laufen noch?
npm run migrate:up              # Spielt alle neuen auf

# App startet danach
npm run server
```

---

## 6. Spezialfälle

### Riskante Datenmigrationen (große Tabellen, Recalc)
→ `.js`-Migration statt `.sql`, mit Progress-Logging, Batch-Processing

**Beispiel-Datei:** `20260308__migrate_big_table_data.js`
```js
const { Pool } = require('pg');

module.exports.up = async (pgm) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Starting backfill...');
    const result = await pool.query('UPDATE big_table SET ...'); // mit LIMIT, OFFSET in Batches
    console.log(`Backfilled ${result.rowCount} rows`);
  } finally {
    await pool.end();
  }
};

module.exports.down = async (pgm) => {
  // ggf. optional
};
```

### Index-Operationen auf großen Tabellen
Nutze `CONCURRENTLY` (non-blocking):
```sql
CREATE INDEX CONCURRENTLY idx_new_col ON big_table(new_column);
```

### Abhängige Änderungen über mehrere Tabellen
→ separate Migrationen in logischer Reihenfolge, ODER eine Migration wenn Transaktion sicher möglich

---

## 7. Fragen beim Schreiben von Agents

**Agent, check diese Punkte vor Commit:**

- [ ] Ändert sich das DB-Schema? → **Neue Migration angelegt?**
- [ ] Migration-Dateiname folgt `YYYYMMDDHHmmss__*` Format?
- [ ] Migration ist lokal auf Dev-DB getestet und läuft sauber?
- [ ] `database.sql` wurde **nicht manuell geändert** (nur auto-snapshot)?
- [ ] Ist die Migration idempotent (kann mehrfach laufen ohne Fehler)?
- [ ] Großes Daten-Update → Batches/Progress-Logging in `.js`-Migration?
- [ ] Drop-Operationen → dokumentiert + deprecation-Phase?

---

## 8. Relevante Befehle (einmal konfiguriren)

```bash
# Root package.json ergänzen:
"scripts": {
  "migrate:create": "cd server && node_modules/.bin/node-pg-migrate create -d migrations",
  "migrate:up": "cd server && node_modules/.bin/node-pg-migrate up",
  "migrate:down": "cd server && node_modules/.bin/node-pg-migrate down",
  "migrate:status": "cd server && node_modules/.bin/node-pg-migrate status",
  "migrate:snapshot": "pg_dump $DATABASE_URL > server/migrations/database.sql"
}

# Installation (noch zu durchführen):
npm install -D node-pg-migrate
```

---

## 9. Kontakt & Eskalation

Falls Agent unsicher ist, ob es eine neue Migration braucht:
→ **Lieber fragen als Silent-Skip**. Das Projekt wird komplexer; Migrationen sind die Baseline.

---

**Gültig ab:** 2026-03-08  
**Zuletzt aktualisiert:** Aktualisiere dieses Dokument, wenn neue Best-Practices emerging.
