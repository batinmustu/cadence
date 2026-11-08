# 0001. Tauri 2 with React and TypeScript

Status: Accepted
Date: 2026-11-08

## Context

macOS-first desktop app, possible mobile later, small single-user utility.

## Decision

Tauri 2 + React + TypeScript + Vite. Logic lives in TypeScript; Rust stays thin.

## Consequences

Small binaries and low memory use; a Tauri 2 mobile path exists; WebKit vs WebView2 differences must be tested when Windows is added; some Rust is needed.

## Alternatives considered

Electron (heavy), NativePHP (extra runtime), SwiftUI (no Windows, separate mobile codebase).
