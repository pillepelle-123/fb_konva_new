# Vollständige Dateiorganisations-Anleitung

## Ausführliche Dokumentation

Diese Datei enthält die vollständigen Details zur Dateiorganisation im fb-konva-fullstack Projekt.

## Dokumentation (.md Dateien)

### Root-Verzeichnis
**ERLAUBT:**
- `README.md` (Hauptprojekt-README)
- `.md` Dateien die Teil der Build-Konfiguration sind

**NICHT ERLAUBT:**
- Feature-Dokumentationen → `docs/features/`
- Implementierungs-Dokumentationen → `docs/implementation/`
- Test-Dokumentationen → `docs/testing/`
- Setup-Anleitungen → `docs/setup/`
- Architektur-Dokumentationen → `docs/architecture/`
- Planungs-Dokumente → `docs/plans/`
- Migrations-Dokumentationen → `docs/migration/`

### Unterverzeichnisse

**`docs/features/`** - Feature-Dokumentationen
- Beschreibungen von Features (z.B. `template-system.md`, `question-pool.md`)
- Feature-spezifische Anleitungen

**`docs/implementation/`** - Technische Implementierungs-Dokumentationen
- Code-Analysen (z.B. `ANALYSE_QNA_INLINE_DIFFERENCES.md`)
- Migration-Dokumentationen (z.B. `pdf-lib-migration.md`)
- Debug-Dokumentationen (z.B. `debug-ruled-lines.md`)
- Cleanup-Reports (z.B. `dead-code-cleanup-report.md`)
- Implementation Summaries (z.B. `implementation-summary.md`)

**`docs/testing/`** - Test-Dokumentationen
- Test-Anleitungen (z.B. `template-testing-guide.md`)
- Test-Ergebnisse (z.B. `test-results.md`)
- Test-Analysen (z.B. `test-issue-analysis.md`)

**`docs/setup/`** - Setup-Anleitungen
- Setup-Dokumentationen (z.B. `admin-area.md`, `aws-s3-setup.md`)

**`docs/architecture/`** - Architektur-Dokumentationen
- Architektur-Beschreibungen (z.B. `shared-utilities.md`)

**`docs/plans/`** - Planungs-Dokumente
- Planungs-Dokumente (z.B. `pdf-rendering-fix-plan.md`)

**`docs/migration/`** - Migrations-Dokumentationen
- Datenbank-Migrations-Dokumentationen

**Ausnahmen:**
- `client/README.md` oder `server/README.md` sind erlaubt, wenn sie spezifisch für diesen Teil sind
- Asset-spezifische READMEs (z.B. `server/assets/icc-profiles/README.md`) sind erlaubt

---

## Skripte (.sh, .js, .py, etc.)

### Root-Verzeichnis
**NICHT ERLAUBT:**
- Deployment-Skripte → `scripts/deployment/`
- Utility-Skripte → `scripts/utils/`
- Analyse-Skripte → `scripts/analysis/`
- Build-Skripte → `scripts/build/`

### Unterverzeichnisse

**`scripts/`** - Hauptverzeichnis für alle Skripte
- Utility-Skripte direkt in `scripts/` (z.B. `find-dead-code.js`)
- Für größere Projekte: Unterverzeichnisse wie `scripts/deployment/`, `scripts/analysis/`, etc.

**`server/scripts/`** - Server-spezifische Skripte
- Datenbank-Migrations-Skripte (z.B. `migrate-uploads.js`)
- Server-Utility-Skripte

**`client/scripts/`** - Client-spezifische Skripte (falls benötigt)
- Build-Skripte für Client
- Client-Utility-Skripte

**Ausnahmen:**
- `deploy_fb.sh` kann im Root bleiben, wenn es das Haupt-Deployment-Skript ist
- Konfigurationsdateien (z.B. `vite.config.ts`, `tsconfig.json`) bleiben in ihren Verzeichnissen

---

## JSON-Dateien (Reports, Daten, Konfigurationen)

### Root-Verzeichnis
**ERLAUBT:**
- `package.json`, `package-lock.json` (Projekt-Konfiguration)
- `.json` Dateien die Teil der Build-Konfiguration sind

**NICHT ERLAUBT:**
- Reports → `docs/implementation/` oder `docs/testing/`
- Daten-JSONs → `shared/data/` oder `server/data/` oder `client/src/data/`
- Analyse-Reports → `docs/implementation/`

### Unterverzeichnisse

**`docs/implementation/`** - Analyse-Reports und Cleanup-Reports
- Dead-Code-Reports (z.B. `dead-code-report.json`)
- Deletion-Batches (z.B. `deletion-batches.json`)
- Analyse-Reports

**`shared/data/`** - Geteilte Daten
- Template-Daten (z.B. `templates/color-palettes.json`)
- Gemeinsame Datenstrukturen

**`server/data/`** - Server-Daten
- Server-spezifische Daten (z.B. `templates.json`)

**`client/src/data/`** - Client-Daten
- Client-spezifische Daten (z.B. `templates/layout.json`)

**Ausnahmen:**
- Konfigurationsdateien (z.B. `tsconfig.json`, `eslint.config.js`) bleiben in ihren Verzeichnissen
- `package.json` und `package-lock.json` bleiben in Root und Unterverzeichnissen

---

## Weitere Dateitypen

### SQL-Datenbank-Skripte (.sql)
- **Schema-Definitionen** → `server/migrations/database.sql`
- **Migrations-Skripte** → `server/migrations/`
- **Seed/Test-Daten** → `server/data/seeds/` oder `server/migrations/seeds/`
- **Backup-Skripte** → `server/scripts/backup/` oder `scripts/database/`

**Ausnahmen:**
- Temporäre SQL-Dumps → `server/data/temp/`

### Docker & Container-Konfigurationen (.yml, .yaml, Dockerfile)
- **Dockerfiles** → `docker/` oder Root
- **docker-compose.yml** → `docker/` oder Root
- **Kubernetes-Manifeste** → `k8s/` oder `deploy/kubernetes/`

### CI/CD Pipelines (.yml, .yaml)
- **GitHub Actions** → `.github/workflows/`
- **GitLab CI** → `.gitlab-ci.yml` (Root)
- **Jenkins/Jenkinsfile** → `jenkins/` oder Root

### API-Dokumentation (.yml, .yaml, .json)
- **OpenAPI/Swagger** → `docs/api/` oder `api/`
- **GraphQL-Schemas** → `docs/api/` oder `shared/graphql/`
- **Postman Collections** → `docs/api/` oder `tools/postman/`

### Server/Infrastruktur-Konfigurationen (.conf, .ini, .toml)
- **nginx/apache configs** → `deploy/nginx/` oder `server/config/`
- **Redis/Memcached configs** → `server/config/` oder `deploy/config/`
- **Monitoring configs** → `deploy/monitoring/` oder `tools/monitoring/`

### Build & Entwicklung (.config.js, .rc, .toml)
- **ESLint/Prettier configs** → Root (bereits dort)
- **EditorConfig** → `.editorconfig` (Root)
- **Husky/Lint-Staged** → Root oder `.husky/`

### Projekt-Management (.md, verschiedene)
- **CHANGELOG.md** → Root
- **CONTRIBUTING.md** → Root (bereits vorhanden)
- **LICENSE** → Root
- **CODE_OF_CONDUCT.md** → Root
- **SECURITY.md** → `.github/` oder Root

### Statische Assets (verschiedene)
- **Icons/SVG** → `client/public/icons/` oder `shared/assets/icons/`
- **Fonts** → `client/public/fonts/` oder `shared/assets/fonts/`
- **Mock-Daten/Images** → `shared/data/mock/` oder `docs/assets/`

### TypeScript/JavaScript Konfigurationsdateien
- Bleiben in ihren Verzeichnissen (`tsconfig.json`, `vite.config.ts`, etc.)
- Keine Verschiebung nötig

### HTML-Templates
- Server-Templates → `server/templates/`
- Client-Templates → `client/public/` oder `client/src/`

### Assets und statische Dateien
- Server-Assets → `server/assets/`
- Client-Assets → `client/public/` oder `client/src/assets/`

---

## Beispiele für korrekte Platzierung

✅ **Korrekt:**
- `docs/implementation/dead-code-cleanup-report.md`
- `scripts/find-dead-code.js`
- `docs/implementation/dead-code-report.json`
- `docs/testing/test-results.md`
- `docs/plans/pdf-rendering-fix-plan.md`
- `server/migrations/database.sql`
- `.github/workflows/ci.yml`
- `docs/api/openapi.yml`
- `docker/docker-compose.yml`
- `deploy/nginx/nginx.conf`

❌ **Falsch:**
- `dead-code-cleanup-report.md` (im Root)
- `find-dead-code.js` (im Root)
- `test-results.md` (im Root)
- `IMPLEMENTATION_SUMMARY.md` (im Root - sollte nach `docs/implementation/`)
- `database.sql` (im Root - sollte nach `server/migrations/`)
- `docker-compose.yml` (im Root - sollte nach `docker/`)
- `nginx.conf` (im Root - sollte nach `deploy/nginx/`)

---

## Migration bestehender Dateien

Wenn Dateien falsch platziert sind:
1. Datei in korrektes Verzeichnis verschieben
2. Referenzen aktualisieren (falls vorhanden)
3. Git-History beibehalten (mit `git mv`)

---

## Ausnahmen und Sonderfälle

**Erlaubte Root-Dateien:**
- `README.md` (Hauptprojekt-README)
- `package.json`, `package-lock.json`
- `.gitignore`, `.cursorignore`
- `deploy_fb.sh` (Haupt-Deployment-Skript)
- Build-Konfigurationsdateien (z.B. `.eslintrc`, `.prettierrc`)

**Erlaubte Verzeichnis-spezifische Dateien:**
- `client/README.md`, `server/README.md` (wenn spezifisch)
- Asset-spezifische READMEs in Asset-Verzeichnissen
- Konfigurationsdateien in ihren Verzeichnissen