# 0002. Local-first storage in SQLite

Status: Accepted
Date: 2026-11-08

## Context

Personal drafts, no need for accounts or servers; sync may come later.

## Decision

SQLite in the app-data directory via `tauri-plugin-sql`; UUIDv7 ids, `created_at`/`updated_at`, soft deletes, append-only migrations.

## Consequences

Offline, free and private; in-app export/backup is needed; sync would need its own ADR but no data migration.

## Alternatives considered

Hosted database (accounts, cost, privacy); JSON files (poor querying).
