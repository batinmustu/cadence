// Pure helpers for the AI settings screen; no storage or UI here.

export const AI_PROVIDERS = ["anthropic", "openai", "openrouter", "ollama"] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export interface ProviderInfo {
  id: AiProviderId;
  /** Suggested models; providers with an empty list take a free-text model name. */
  models: string[];
  needsKey: boolean;
}

export const PROVIDER_INFO: Record<AiProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    models: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"],
    needsKey: true,
  },
  openai: { id: "openai", models: ["gpt-4o", "gpt-4o-mini"], needsKey: true },
  openrouter: { id: "openrouter", models: [], needsKey: true },
  ollama: { id: "ollama", models: [], needsKey: false },
};

export const DEFAULT_PROVIDER: AiProviderId = "anthropic";
export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const MAX_TONE_LENGTH = 2000;

export function isProviderId(value: unknown): value is AiProviderId {
  return typeof value === "string" && (AI_PROVIDERS as readonly string[]).includes(value);
}

export function parseProvider(raw: string | null): AiProviderId {
  return isProviderId(raw) ? raw : DEFAULT_PROVIDER;
}

export function defaultModel(provider: AiProviderId): string {
  return PROVIDER_INFO[provider].models[0] ?? "";
}

export function modelOrDefault(provider: AiProviderId, stored: string | null): string {
  const trimmed = stored?.trim();
  return trimmed ? trimmed : defaultModel(provider);
}

export function normalizeTone(raw: string): string {
  return raw.trim().slice(0, MAX_TONE_LENGTH);
}

export type AiStatus =
  | { state: "notConnected" }
  | { state: "connected"; provider: AiProviderId; model: string };

/**
 * A provider counts as connected once a key is stored (or, for local models,
 * once a connection test has succeeded) and a model is chosen.
 */
export function aiStatus(input: {
  provider: AiProviderId;
  model: string;
  hasKey: boolean;
  verified: boolean;
}): AiStatus {
  const ready = PROVIDER_INFO[input.provider].needsKey ? input.hasKey : input.verified;
  if (!ready || !input.model) return { state: "notConnected" };
  return { state: "connected", provider: input.provider, model: input.model };
}
