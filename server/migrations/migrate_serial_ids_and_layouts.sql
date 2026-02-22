-- Migration: Serial IDs fuer color_palettes, themes, layout_templates
-- sowie Umbenennung layout_templates -> layouts, layout_template_id -> layout_id
--
-- Fuehrt bestehende String-IDs auf fortlaufende SERIAL-IDs um.
-- Referenzen in books und pages werden ueber ID-Mappings aktualisiert.

BEGIN;

-- 1. Mapping-Tabellen fuer alte -> neue IDs
CREATE TEMP TABLE palette_id_map (old_id TEXT PRIMARY KEY, new_id INT);
CREATE TEMP TABLE theme_id_map (old_id TEXT PRIMARY KEY, new_id INT);
CREATE TEMP TABLE layout_id_map (old_id TEXT PRIMARY KEY, new_id INT);

-- 2. color_palettes: neue Tabelle mit SERIAL id
CREATE TABLE IF NOT EXISTS color_palettes_new (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  parts JSONB NOT NULL DEFAULT '{}'::jsonb,
  contrast TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO color_palettes_new (name, colors, parts, contrast, sort_order, created_at, updated_at)
SELECT name, colors, parts, contrast, sort_order, created_at, updated_at
FROM color_palettes
ORDER BY sort_order ASC, name ASC;

INSERT INTO palette_id_map (old_id, new_id)
SELECT cp.id::text, cp_new.id
FROM color_palettes cp
JOIN color_palettes_new cp_new ON cp.name = cp_new.name AND cp.sort_order = cp_new.sort_order;

-- 3. themes: neue Tabelle mit SERIAL id, palette_id INTEGER
CREATE TABLE IF NOT EXISTS themes_new (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  palette_id INT REFERENCES color_palettes_new(id),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO themes_new (name, description, palette_id, config, sort_order, created_at, updated_at)
SELECT t.name, t.description,
       (SELECT new_id FROM palette_id_map WHERE old_id = t.palette_id::text LIMIT 1),
       t.config, t.sort_order, t.created_at, t.updated_at
FROM themes t;

INSERT INTO theme_id_map (old_id, new_id)
SELECT t.id::text, t_new.id
FROM themes t
JOIN themes_new t_new ON t.name = t_new.name AND COALESCE(t.description, '') = COALESCE(t_new.description, '');

-- 4. layouts: neue Tabelle (layout_templates -> layouts) mit SERIAL id
CREATE TABLE IF NOT EXISTS layouts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  thumbnail TEXT,
  textboxes JSONB NOT NULL DEFAULT '[]'::jsonb,
  elements JSONB DEFAULT '[]'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO layouts (name, category, thumbnail, textboxes, elements, meta, sort_order, created_at, updated_at)
SELECT name, category, thumbnail, textboxes, elements, meta, sort_order, created_at, updated_at
FROM layout_templates
ORDER BY sort_order ASC, name ASC;

INSERT INTO layout_id_map (old_id, new_id)
SELECT lt.id::text, l.id
FROM layout_templates lt
JOIN layouts l ON lt.name = l.name AND COALESCE(lt.category, '') = COALESCE(l.category, '') AND lt.sort_order = l.sort_order;

-- 5. books: nur migrieren wenn theme_id noch VARCHAR/TEXT ist
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'books' AND column_name = 'theme_id';
  IF col_type IN ('character varying', 'text') THEN
    ALTER TABLE books ADD COLUMN IF NOT EXISTS theme_id_new INT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS color_palette_id_new INT;
    ALTER TABLE books ADD COLUMN IF NOT EXISTS layout_id INT;
    UPDATE books b SET
      theme_id_new = (SELECT new_id FROM theme_id_map WHERE old_id = b.theme_id::text LIMIT 1),
      color_palette_id_new = (SELECT new_id FROM palette_id_map WHERE old_id = b.color_palette_id::text LIMIT 1),
      layout_id = (SELECT new_id FROM layout_id_map WHERE old_id = b.layout_template_id::text LIMIT 1);
    ALTER TABLE books DROP COLUMN IF EXISTS theme_id;
    ALTER TABLE books DROP COLUMN IF EXISTS color_palette_id;
    ALTER TABLE books DROP COLUMN IF EXISTS layout_template_id;
    ALTER TABLE books RENAME COLUMN theme_id_new TO theme_id;
    ALTER TABLE books RENAME COLUMN color_palette_id_new TO color_palette_id;
    DROP INDEX IF EXISTS idx_books_layout_template_id;
    DROP INDEX IF EXISTS idx_books_theme_id;
    DROP INDEX IF EXISTS idx_books_color_palette_id;
    CREATE INDEX IF NOT EXISTS idx_books_theme_id ON books(theme_id);
    CREATE INDEX IF NOT EXISTS idx_books_color_palette_id ON books(color_palette_id);
    CREATE INDEX IF NOT EXISTS idx_books_layout_id ON books(layout_id);
  END IF;
END $$;

-- 6. pages: nur migrieren wenn theme_id noch VARCHAR/TEXT ist
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'pages' AND column_name = 'theme_id';
  IF col_type IN ('character varying', 'text') THEN
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS theme_id_new INT;
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS color_palette_id_new INT;
    ALTER TABLE pages ADD COLUMN IF NOT EXISTS layout_id INT;
    UPDATE pages p SET
      theme_id_new = (SELECT new_id FROM theme_id_map WHERE old_id = p.theme_id::text LIMIT 1),
      color_palette_id_new = (SELECT new_id FROM palette_id_map WHERE old_id = p.color_palette_id::text LIMIT 1),
      layout_id = (SELECT new_id FROM layout_id_map WHERE old_id = p.layout_template_id::text LIMIT 1);
    ALTER TABLE pages DROP COLUMN IF EXISTS theme_id;
    ALTER TABLE pages DROP COLUMN IF EXISTS color_palette_id;
    ALTER TABLE pages DROP COLUMN IF EXISTS layout_template_id;
    ALTER TABLE pages RENAME COLUMN theme_id_new TO theme_id;
    ALTER TABLE pages RENAME COLUMN color_palette_id_new TO color_palette_id;
    DROP INDEX IF EXISTS idx_pages_layout_template_id;
    DROP INDEX IF EXISTS idx_pages_theme_id;
    DROP INDEX IF EXISTS idx_pages_color_palette_id;
    CREATE INDEX IF NOT EXISTS idx_pages_theme_id ON pages(theme_id);
    CREATE INDEX IF NOT EXISTS idx_pages_color_palette_id ON pages(color_palette_id);
    CREATE INDEX IF NOT EXISTS idx_pages_layout_id ON pages(layout_id);
  END IF;
END $$;

-- 7. Alte Tabellen droppen, neue umbenennen
DROP TABLE IF EXISTS layout_templates;
DROP TABLE IF EXISTS themes;
DROP TABLE IF EXISTS color_palettes;

ALTER TABLE color_palettes_new RENAME TO color_palettes;
ALTER TABLE themes_new RENAME TO themes;

CREATE INDEX IF NOT EXISTS idx_layouts_category ON layouts(category);

COMMIT;