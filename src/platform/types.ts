// Every native capability is reached through these interfaces (ADR 0004 for Secrets).

export type SqlValue = string | number | null;

export interface Database {
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  transaction<T>(fn: (db: Database) => Promise<T>): Promise<T>;
}

export type ProviderId = "anthropic" | "openai" | "openrouter" | "ollama";

/** There is deliberately no getKey: keys never reach the web view. */
export interface Secrets {
  setKey(provider: ProviderId, key: string): Promise<void>;
  hasKey(provider: ProviderId): Promise<boolean>;
  clearKey(provider: ProviderId): Promise<void>;
}

export interface AIRequest {
  provider: ProviderId;
  model: string;
  system: string;
  prompt: string;
}

export interface AI {
  complete(request: AIRequest): AsyncIterable<string>;
  testConnection(provider: ProviderId): Promise<boolean>;
}

export type WindowPlatform = "macos" | "windows" | "linux" | "web";

export interface AppWindow {
  platform: WindowPlatform;
  toggleSidebarShortcut: string;
  /** Fires when the global quick-capture shortcut is pressed. No-op in the browser. */
  onQuickCapture(listener: () => void): () => void;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  at: string;
}

export interface Notifications {
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
}

export interface Clipboard {
  writeText(text: string): Promise<void>;
}

export interface Platform {
  database: Database;
  secrets: Secrets;
  ai: AI;
  window: AppWindow;
  notifications: Notifications;
  clipboard: Clipboard;
}
