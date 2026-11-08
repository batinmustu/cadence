-- Append-only: never edit this file once it is on main (CLAUDE.md rule 7).
CREATE TABLE platforms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE content_types (
  id TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  name TEXT NOT NULL,
  field_schema TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_content_types_platform ON content_types(platform_id);

CREATE TABLE series (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  weekdays TEXT NOT NULL DEFAULT '[]',
  time TEXT NOT NULL DEFAULT '09:00',
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  anchor_date TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT '',
  remind_before_hours INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_series_platform ON series(platform_id);

CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'planned', 'published', 'archived')),
  series_id TEXT REFERENCES series(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_ideas_series ON ideas(series_id);

CREATE TABLE idea_platforms (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  platform_id TEXT NOT NULL REFERENCES platforms(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (idea_id, platform_id)
);
CREATE INDEX idx_idea_platforms_platform ON idea_platforms(platform_id);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  content_type_id TEXT NOT NULL REFERENCES content_types(id),
  fields TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  published_at TEXT,
  published_url TEXT,
  after_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_posts_idea ON posts(idea_id);
CREATE INDEX idx_posts_content_type ON posts(content_type_id);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE idea_tags (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (idea_id, tag_id)
);
CREATE INDEX idx_idea_tags_tag ON idea_tags(tag_id);

CREATE TABLE ai_commands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  content_type_id TEXT REFERENCES content_types(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_ai_commands_content_type ON ai_commands(content_type_id);

CREATE TABLE settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
