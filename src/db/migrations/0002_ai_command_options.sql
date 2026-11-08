-- Commands that return alternatives (hooks, titles) ask the model for JSON options.
ALTER TABLE ai_commands ADD COLUMN returns_options INTEGER NOT NULL DEFAULT 0;
