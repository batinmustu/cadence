# 0003. Platforms and content types are data

Status: Accepted
Date: 2026-11-08

## Context

Users will want more platforms; content types differ in fields and limits.

## Decision

`platforms` and `content_types` tables with JSON field schemas; schema-driven editor; X and YouTube seeded; no code branches on platform names.

## Consequences

Users add platforms without a release; a generic field renderer is needed; platform helpers become AI commands or field-kind behaviour.

## Alternatives considered

Hard-coded platform modules.
