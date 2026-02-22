-- Themes (id = Text-Key wie default, sketchy)
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  palette_id TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Color Palettes
CREATE TABLE IF NOT EXISTS color_palettes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  parts JSONB NOT NULL DEFAULT '{}'::jsonb,
  contrast TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layout Templates
CREATE TABLE IF NOT EXISTS layout_templates (
  id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_layout_templates_category ON layout_templates(category);
