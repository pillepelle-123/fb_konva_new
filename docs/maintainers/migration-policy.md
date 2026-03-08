# Migrations-Policy und Strategie

Detaillierte Dokumentation für Entwickler und Maintainer zur Verwaltung von Datenbankmigrationen in diesem Projekt.

**Gültig ab:** März 2026  
**Siehe auch:** `AGENTS.md` für KI-Agent-Instruktionen

---

## Hintergrund: Warum Migrationen?

Vorher (problematisch):
- Hunderte lose SQL-Dateien in `server/migrations/` ohne klare Reihenfolge
- Keine Tracking-Tabelle: unklar, welche Migrationen wann liefen
- Schema-Drifts zwischen Dev/Test/Prod-Umgebungen
- Neue Entwickler raten: "In welcher Reihenfolge soll ich das einspielen?"

Nachher (professionell):
- Jede Schema-Änderung ist eine numerierte, orderte Migration
- Migration-History in der DB gespeichert (`schema_version`-ähnliche Tabelle)
- Reproduzierbarer Aufbau: `npm run migrate:up` ist Goldstandard
- `database.sql` ist ein Snapshot zum schnellen Bootstrap, nicht die manuelle Quelle

---

## Setup: Vom alten Stand zum neuen

### Schritt 1: Status quo dokumentieren
Der heutige Stand ist in `server/migrations/database.sql` abgebildet.  
Alle älteren loose Migrationen in `server/migrations/*.sql/*.js` sind Legacy.

**Entscheidung:** Wir nutzen ab sofort `node-pg-migrate` als Tool.

### Schritt 2: Tool installieren
```bash
cd server
npm install -D node-pg-migrate
```

### Schritt 3: Baseline-Migration erzeugen
```bash
npm run migrate:create --name "init_baseline_from_march_2026"
```

Diese Migration enthält den kompletten aktuellen Schema-Stand aus `database.sql`. Sie ist die "Ausgangsposition" für alle neuen DBs.

### Schritt 4: Alte DBs markieren
```sql
-- Auf bestehenden Datenbanken einfach manual ausführen:
-- (Syntax hängt von node-pg-migrate ab, typisch)
INSERT INTO pgmigrations (name, run_on) 
VALUES ('20260308090000__init_baseline_from_march_2026', NOW());
```

Das sagt: "Diese Migration ist bereits angewendet." Zukünftige neue Migrationen laufen dann nur noch oben drauf.

### Schritt 5: Legacy-Ordner archivieren
```bash
# Alle alten Dateien in Legacy-Ordner verschieben
mkdir server/migrations/_legacy
mv server/migrations/add_*.sql server/migrations/_legacy/
mv server/migrations/migrate_*.sql server/migrations/_legacy/
mv server/migrations/create_*.* server/migrations/_legacy/
# ... etc
```

(Optional: Diese Dateien können gelöscht werden, aber bewahren sie zum Referenzieren auf.)

---

## Konventionen

### Dateiname-Format
```
YYYYMMDDHHmmss__kurze_verstaendliche_beschreibung.sql
```

**Komponenten:**
- `YYYYMMDD`: Datum der Erstellung (2026-03-08 → 20260308)
- `HHmmss`: Uhrzeit für Eindeutigkeit (090000 → 09:00:00)
- `__`: Trenner (zwei Unterstriche)
- `kurze_verstaendliche_beschreibung`: Was ändert sich? (Snake_case, max ~40 Zeichen)

**Beispiele (gut):**
- `20260308090000__init_baseline.sql`
- `20260308091500__add_mfa_column_to_users.sql`
- `20260308093000__create_audit_log_table.sql`
- `20260310150000__add_index_orders_user_id.sql`
- `20260312080000__backfill_created_at_nullable.sql`

**Beispiele (schlecht):**
- `add_stuff.sql` ← Keine Sortierbarkeit
- `20260308_migration.sql` ← Zu vage
- `20260308090000-add_mfa_column_to_users.sql` ← Single `-` statt `__`

### Inhalt einer Migration

#### Struktur (SQL)
```sql
-- YYYYMMDDHHmmss__beschreibung.sql
BEGIN; -- Transaktion starten

-- === UP: Beschreibung der Änderung ===
-- Kurzer Kommentar: Was wird gebaut/geändert?

CREATE TABLE my_new_table (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_my_new_table_created ON my_new_table(created_at);

COMMIT;

-- === DOWN (optional, für lokale Rollbacks) ===
-- Beachte: DOWN läuft in separater Transaktion
BEGIN;

DROP TABLE IF EXISTS my_new_table CASCADE;

COMMIT;
```

#### Idempotenz
- `CREATE TABLE IF NOT EXISTS` (verhindert Fehler bei Wiederholung)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP TABLE IF EXISTS`

**Generelle Regel:** Migration muss mehrfach laufen können (lokal beim Entwickeln) ohne Fehler zu werfen.

---

## Häufige Szenarien

### Szenario 1: Neue Spalte hinzufügen

**Migration:**
```sql
-- 20260308091500__add_invitation_token_to_users.sql

BEGIN;

ALTER TABLE users ADD COLUMN invitation_token UUID;
ALTER TABLE users ADD COLUMN invited_by INTEGER REFERENCES users(id);

CREATE INDEX idx_users_invitation_token ON users(invitation_token);

COMMIT;

-- DOWN
BEGIN;
ALTER TABLE users DROP COLUMN invited_by CASCADE;
ALTER TABLE users DROP COLUMN invitation_token CASCADE;
COMMIT;
```

**TypeScript Types gleichzeitig:** 
```ts
// shared/types/User.ts
export interface User {
  id: number;
  email: string;
  invitationToken?: string;  // ← neu
  invitedBy?: number;         // ← neu
}
```

---

### Szenario 2: Tabelle umbenennen

```sql
-- 20260308093000__rename_books_to_projects.sql

BEGIN;

ALTER TABLE books RENAME TO projects;
ALTER TABLE page_assignments RENAME COLUMN book_id TO project_id;  -- Falls FK existiert
ALTER INDEX idx_books_owner_id RENAME TO idx_projects_owner_id;

COMMIT;

-- DOWN
BEGIN;
ALTER TABLE projects RENAME TO books;
ALTER TABLE page_assignments RENAME COLUMN project_id TO book_id;
ALTER INDEX idx_projects_owner_id RENAME TO idx_books_owner_id;
COMMIT;
```

---

### Szenario 3: Spalten-Datentyp migrieren (z.B. SERIAL → UUID)

**Hinweis:** Vorsicht mit großen Tabellen!

```sql
-- 20260308094500__migrate_questions_id_serial_to_uuid.sql

BEGIN;

-- Step 1: Neue UUID-Spalte hinzufügen
ALTER TABLE questions ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();

-- Step 2: Alte und neue Spalte syncen (copy)
UPDATE questions SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Step 3: Abhängige FKs auf neue UUIDs setzen (zuerst old IDs zu UUIDs mappen)
-- (Komplex: siehe Repo-Memory:  Mapping-Spalte zwischenspeichern)

-- Step 4: Alte Spalte als PK vergessen, neue setzen
ALTER TABLE questions DROP CONSTRAINT questions_pkey CASCADE;
ALTER TABLE questions DROP COLUMN id;
ALTER TABLE questions RENAME COLUMN id_uuid TO id;
ALTER TABLE questions ADD PRIMARY KEY (id);

COMMIT;

-- DOWN: Kompliziert, meist nicht implemtiert (forward-only)
```

**Grundregel für große Migrationen:** Separiere in mehrere kleine Migrationen, um Locks zu minimieren.

---

### Szenario 4: Daten-Backfill (großer Datensatz)

```js
// 20260308095000__backfill_user_created_at.js

module.exports.up = async (pgm) => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('[Migration] Backfilling user.created_at...');
    
    // Batch-Update (z.B. 1000 Zeilen pro Iteration)
    const batchSize = 1000;
    let offset = 0;
    let updated = 0;

    while (true) {
      const res = await pool.query(
        `UPDATE users 
         SET created_at = NOW() 
         WHERE created_at IS NULL 
         LIMIT $1`,
        [batchSize]
      );

      if (res.rowCount === 0) break;
      
      updated += res.rowCount;
      offset += batchSize;
      console.log(`[Migration] Updated ${updated} rows...`);
    }

    console.log(`[Migration] Backfill complete: ${updated} rows updated`);
  } finally {
    await pool.end();
  }
};

module.exports.down = async (pgm) => {
  // Optional: nur wenn easy zu revert
};
```

---

### Szenario 5: Spalte entfernen (riskant → 2-Phasen)

**Phase 1 (Migration 1):** Spalte deprecaten + Standardwert setzen
```sql
-- 20260310100000__deprecate_legacy_field.sql

BEGIN;

-- Kommentar setzen (Dokumentation in DB)
COMMENT ON COLUMN books.legacy_field IS 'DEPRECATED: To be removed in v2.0. Use new_field instead.';

-- Ggf. bereits NULL auf neue Spalte backfüllen
UPDATE books SET new_field = legacy_field WHERE new_field IS NULL AND legacy_field IS NOT NULL;

-- App wird angepasst: ignoriert legacy_field komplett

COMMIT;
```

**Phase 2 (Migration 2, 1–2 Minor-Versionen später):** Spalte entfernen
```sql
-- 20260615100000__drop_legacy_field.sql

BEGIN;

ALTER TABLE books DROP COLUMN legacy_field CASCADE;

COMMIT;
```

**Grund:** Wenn Migration fehlschlägt, haben alte App-Versionen noch Zugriff auf die Spalte.

---

## Pre-Deploy-Checkliste

Bevor Migrations in Prod gehen:

- [ ] **Lokal getestet:** `npm run migrate:up` läuft sauber
- [ ] **Idempotenz:** `npm run migrate:up` erneut → keine Fehler
- [ ] **Rollback lokal:** `npm run migrate:down` (optional, aber gut zu haben)
- [ ] **Migration-Name:** `YYYYMMDDHHmmss__*` Format korrekt?
- [ ] **Schema-Änderung?** Dann auch Code/Types aktualisiert?
- [ ] **Große Änderung?** Durchlauf-Dauer geschätzt (bei uns < 1 min ideal)?
- [ ] **Code-Merge:** PR hat Migration + Code zusammen (nicht nur Code!)

---

## Befehle (Referenz)

```bash
# Neue Migration erzeugen
npm run migrate:create --name "kurze_beschreibung"

# Alle ausstehenden Migrationen ausführen
npm run migrate:up

# Letzte Migration rückgängig machen (lokal!)
npm run migrate:down

# Status anzeigen: welche laufen, welche noch nicht?
npm run migrate:status

# Snapshot von aktueller DB → database.sql (monatlich)
pg_dump $DATABASE_URL > server/migrations/database.sql

# Spezifisch bis zu einer Nummer hochfahren
npm run migrate:up -- --target 20260308091500
```

---

## Troubleshooting

### Problem: Migration läuft nicht, sagt "bereits angewendet"
**Lösung:** Dateiname hat sich geändert. Entweder:
1. In `pgmigrations`-Tabelle manuell alte Zeile löschen (wenn sicher)
2. Oder neue Migration mit anderem Namen schreiben

### Problem: Dev-DB ist "out of sync" mit Prod-Status
**Lösung:**
```bash
# Fresh DB: komplett neu aus Baseline
npm run migrate:reset  # (wenn Tool konfiguriert)

# Oder manuell:
rm local.db  # Wenn SQLite, oder DB drops mit psql
npm run migrate:up
```

### Problem: Migration war fehlerhaft, Code ist bereits in Prod
**Lösung (Best Practice):**
1. Neue **korrigierende** Migration schreiben (nicht alte editieren)
2. Korrektur deployen
3. Alte fehlerhafte Migration dokumentieren ("Don't use, see XXX instead")

### Problem: Migration ist zu groß / hat mehrere Concerns
**Lösung:** Splitten! Eine Migration = ein Dings (1 Tabelle, 1 Index, 1 Backfill).
```bash
# Statt:
20260308100000__big_refactor.sql

# Lieber:
20260308100000__create_audit_table.sql
20260308100130__add_audit_columns_to_users.sql
20260308100230__backfill_audit_entries.sql
```

---

## Glossar

| Begriff | Bedeutung |
|---------|-----------|
| **Migration** | Eine Datei (SQL oder JS), die Schema oder Data ändert |
| **UP** | "Ausführen": Schema vorwärts ändern |
| **DOWN** | "Rückgängig": Schema zurückfahren (optional) |
| **Idempotent** | Migration läuft mehrfach = sames Resultat (keine Fehler) |
| **Transaktional** | Changes sind atomar: alle oder keine (rollback bei Fehler) |
| **pgmigrations** | Tool-interne Tabelle, speichert welche Migrations liefen |
| **Snapshot** | Datenbank-Dump (Kopie des kompletten Schemas + Data) |
| **Baseline** | Initiale Migration = Ausgangsstand für neue DBs |

---

## Best Practices (zusammengefasst)

1. **Kleine Migrationen:** Eine Migration = ein Thema
2. **Naming:** ISO-Timestamp + verständliche Beschreibung
3. **Idempotenz:** `IF NOT EXISTS`, `IF EXISTS` nutzen
4. **Lokal testen:** Vor Commit auf Dev-DB durchlaufen
5. **Keine Edits:** Fehlerhafte Migration → neue korrigierende, nicht die alte fixen
6. **Schema + Code:** Zusammen committen, zusammen merged
7. **Riskante Drops:** 2-Phasen mit Deprecation-Phase
8. **Große Operationen:** Batches, Progress-Logging, `.js`-Migration

---

## Weitere Ressourcen

- `AGENTS.md` – Instruktionen für KI-Agents
- `node-pg-migrate` Docs: https://salsita.github.io/node-pg-migrate/
- `READMEs/Deployments` – Wie Migrations in CI/Deploy laufen

---

**Aktualisiert:** 2026-03-08  
**Nächste Review:** Nach First Production Migration (Learnings dokumentieren)
