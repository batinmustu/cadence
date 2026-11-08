import { useEffect, useState } from "react";
import {
  type AiProviderId,
  type AiStatus,
  aiStatus,
  DEFAULT_OLLAMA_URL,
  modelOrDefault,
  parseProvider,
} from "../../core/aiSettings";
import { createSettingsRepository } from "../../db/repositories/settings";
import { platform } from "../../platform";
import { notifyAiSettingsChanged, onAiSettingsChanged } from "./aiEvents";

export const settingKeys = {
  provider: "ai.provider",
  model: (p: AiProviderId) => `ai.model.${p}`,
  tone: "ai.tone",
  ollamaUrl: "ai.ollama.baseUrl",
  verified: (p: AiProviderId) => `ai.verified.${p}`,
};

const repo = () => createSettingsRepository(platform.database);

export interface AiConfig {
  provider: AiProviderId;
  model: string;
  tone: string;
  ollamaUrl: string;
  hasKey: boolean;
  verified: boolean;
}

export async function loadAiConfig(provider?: AiProviderId): Promise<AiConfig> {
  const s = repo();
  const p = provider ?? parseProvider(await s.get(settingKeys.provider));
  const [model, tone, url, verified, hasKey] = await Promise.all([
    s.get(settingKeys.model(p)),
    s.get(settingKeys.tone),
    s.get(settingKeys.ollamaUrl),
    s.get(settingKeys.verified(p)),
    platform.secrets.hasKey(p),
  ]);
  return {
    provider: p,
    model: modelOrDefault(p, model),
    tone: tone ?? "",
    ollamaUrl: url ?? DEFAULT_OLLAMA_URL,
    hasKey,
    verified: verified === "1",
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await repo().set(key, value);
  notifyAiSettingsChanged();
}

export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>({ state: "notConnected" });
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      loadAiConfig()
        .then((c) => {
          if (!cancelled) setStatus(aiStatus(c));
        })
        .catch(() => {
          // The sidebar must never break the shell.
        });
    void load();
    const off = onAiSettingsChanged(() => void load());
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  return status;
}
