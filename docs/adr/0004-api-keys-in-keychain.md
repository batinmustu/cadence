# 0004. AI API keys live in the OS keychain and never reach the web view

Status: Accepted
Date: 2026-11-08

## Context

Users bring their own keys; leaks cost money; the web view and SQLite are easy to inspect.

## Decision

Rust stores keys in the keychain (`keyring` crate). The frontend can set, test, clear and check existence, never read. AI requests are made from Rust and streamed back as events. Keys are never in the DB, files or logs.

## Consequences

A web view compromise cannot exfiltrate keys via the app API; each provider needs a small Rust adapter; Ollama uses the same path without a key.

## Alternatives considered

Keys in SQLite or settings (plain text); requests from the frontend (key exposed).
