# Admin-Bereich – Architektur, Tests & Workflows

## Überblick

- **Pfad**: `client/src/admin`
- **Routing**: lazy geladen über `AdminRoute` (`/admin/*`) mit `AdminGuard` (SSO + Role Check).
- **Layout**: `AdminLayout` (Sidebar, Header, Responsive Sheet) basierend auf shadcn Admin Kit Patterns.
- **State-Management**: [TanStack Query](https://tanstack.com/query/latest) (lokaler QueryClient via `AdminQueryClientProvider`).
- **Tabellen**: Generische `DataTable`-Komponenten mit TanStack Table (Sortierung, Global Search, Column Filter, Bulk Actions).
- **Backend**: Express-Endpoints unter `/api/admin/*` mit eigener `requireAdmin`-Middleware + öffentliche `/api/background-images`.

## Frontend-Dateistruktur (Auszug)

```
client/src/admin/
  AdminApp.tsx              # lazy Route Container
  routes.tsx                # Suspense + Guard Wrapper
  layouts/AdminLayout.tsx   # Admin Shell
  components/
    table/…                 # DataTable + Toolbar + Pagination
    forms/…                 # Dialoge für CRUD (User, Books, Pages, Background Images)
    combobox/…              # CreatableCombobox (Kategorie-Auswahl)
  hooks/…                   # React Query Hooks für Ressourcen
  services/…                # REST-Adapter + Zod Validierung
  pages/
    users/…                 # Benutzerverwaltung
    books/…                 # Buchverwaltung
    page-records/…          # Seitenfortschritt
    background-images/…     # Hintergrundbilder (Upload, Edit, Bulk Delete)
```

## Backend-Integration

| Ressource | Endpoint | Features |
|-----------|----------|----------|
| Users     | `GET/POST/PATCH /api/admin/users`, `POST /api/admin/users/bulk` | Filter, CRUD, Bulk Activate/Suspend/Delete |
| Books     | `GET/POST/PATCH /api/admin/books`, `POST /api/admin/books/bulk` | Status-Wechsel (`active/draft/archived`), Archivierung |
| Pages     | `GET /api/admin/pages`, `POST /api/admin/pages/bulk` | Zuweisen/Unassign/Publish, Status-Workflow |
| Background Images | `GET/POST/PATCH/DELETE /api/admin/background-images`, `POST /api/admin/background-images/bulk-delete`, `POST /api/admin/background-images/upload`, `GET/POST/PATCH/DELETE /api/admin/background-images/categories` | CRUD, Datei-Upload, Multi-Upload-Metadaten, Kategorieverwaltung, Bulk Delete |

- Gemeinsam genutzte Middleware: `authenticateToken` + `requireAdmin`.
- Neue Schema-Felder:
  - `users.admin_status`
  - `books.admin_state`
  - `pages.admin_state`
- Neue Tabellen:
  - `background_image_categories` (`id`, `name`, `slug`, `created_at`, `updated_at`)
  - `background_images` (`id`, `slug`, `category_id`, Metadaten, `storage_type`, `file_path`, `default_*`, `tags`, `metadata`, `created_at`, `updated_at`)
- Öffentliche Endpoints für Frontend:
  - `GET /api/background-images`
  - `GET /api/background-images/categories`
  - `GET /api/background-images/:identifier`

> Migration ausführen: `psql < server/migrations/create_background_images_tables.sql` oder via bestehendem Migrationstool.
>
> Altbestand importieren: `node server/scripts/import-background-images.js` (nutzt `client/src/data/templates/background-images.json` als Quelle). Import schreibt Metadaten **und** kopiert die SVG-/Pixel-Dateien aus `client/src/assets/background-images/**` nach `uploads/background-images/**`.

## Tests & QA

### 1. Automatisierbare Checks

| Typ | Befehl | Erwartung |
|-----|--------|-----------|
| Lint | `npm run lint` (client) | keine neuen Fehler |
| Builds | `npm run build` (client) | Vite Build erfolgreich |
| Backend | `npm start` (server) | Routen werden registriert, Admin-/Public-Endpunkte liefern 200 |

Optional (Schnelltests):
```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/admin/users
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test","email":"test@example.com","role":"editor","status":"invited"}' \
  http://localhost:5000/api/admin/users
```

### 2. Manuelle QA-Checkliste

Frontend
- [ ] `/admin/users`: Suche, Rollen- & Status-Filter, Bulk-Aktionen (Aktivieren/Sperren/Löschen), Dialoge (Neu/Edit).
- [ ] `/admin/books`: Filter, Archivieren/Restore/Delete (inkl. UI-Status).
- [ ] `/admin/pages`: Filter, Bulk Assign (mit Auswahl), Unassign, Publish, mobile Navigation.
- [ ] `/admin/background-images`: Filter (Suche, Storage, Kategorien), Bulk Delete, Edit-Dialog, Upload-Dialog (Multi) inkl. Datei-Upload.
- [ ] Nach Upload liegen Dateien unter `uploads/background-images/<category>/…` und sind über `/uploads/...` erreichbar.
- [ ] Creatable Combobox erstellt Kategorien und zeigt neue Kategorien direkt im Filter an.
- [ ] Guards: Kein Zugriff ohne Login, kein Zugriff für Nicht-Admins.

Backend
- [ ] `/api/admin/users` reagiert mit paginierten Daten + Filter (role/status).
- [ ] CRUD & Bulk Aktionen aktualisieren `admin_status` korrekt.
- [ ] `/api/admin/books` liefert Counters & Status; Archivierung toggelt `archived`.
- [ ] `/api/admin/pages` liefert Assignments (Name + ID); Bulk Actions aktualisieren `page_assignments` & `admin_state`.
- [ ] `/api/admin/background-images` erstellt/aktualisiert Metadaten (Slug, Defaults, Tags, Kategorie); `bulk-delete` entfernt mehrere Einträge.
- [ ] `/api/background-images` liefert Metadaten für Editor/Client (Slug, Defaults, Storage) und verweist auf `uploads/background-images`.

### 3. Erweiterte Tests (Empfehlung)

- Vitest/RTL-Komponententests für `DataTable` (Filter & Bulk Buttons).
- Supertest-Suite für `/api/admin/*` (Role Check, Payload Validierung, File-Metadaten).
- Supertest-/Integrationstests für `/api/background-images` (ohne Auth).
- Playwright/Cypress Flow: Login als Admin ⇒ `/admin/users` ⇒ Filter/Bulk/Dialogs ⇒ Logout.
- Playwright-Flow `/admin/background-images`: Upload-Dialog (Dummy-Dateien), Edit, Bulk-Delete.

## Wartung & Erweiterung

- Neue Ressourcen können via `client/src/admin/pages/<resource>` + Hook + Service ergänzt werden.
- `DataTable` erlaubt zusätzliche Filter (`filterFields`) & Bulk-Aktionen per Konfiguration.
- Backend: `server/routes/admin` Feature-Ordnerstruktur; `requireAdmin` für weitere Services wiederverwenden.
- Für Auditing/Activity-Logs: Separate Tabelle `admin_logs` + Hook (Mutation Success Handler).
- `background-images.json` wird ausschließlich als Legacy-Seed für das Importscript genutzt.
- Frontend lädt Metadaten zur Laufzeit über `/api/background-images` (`loadBackgroundImageRegistry()` in `main.tsx`) und befüllt SVG-Rohdaten dynamisch.
- Dateispeicher aktuell lokal (`uploads/background-images`). Der File-Service ist modular aufgebaut und kann auf S3 erweitert werden (`storage_type`, `bucket`, `object_key`).

## ToDos / Offene Punkte

- Migrationen deployen & ggf. Backfill (admin_state/admin_status) prüfen.
- File-Service um echten S3-Adapter erweitern (Upload/Delete), ggf. Presigned-URL-Flow.
- Automatische Thumbnail-Generierung (PNG/WEBP) für hochgeladene SVGs/Pixelgrafiken.
- Optionales Feature Flagging (z. B. LaunchDarkly) für stufenweise Aktivierung.
- Monitoring/Logging (z. B. Winston, pino) für Admin-Aktionen integrieren.

