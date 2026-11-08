import { invoke } from "@tauri-apps/api/core";
import type { ProviderId, Secrets } from "../types";

/** Thin bridge to the Rust keychain commands. No call can return a key (ADR 0004). */
export function createTauriSecrets(): Secrets {
  return {
    async setKey(provider: ProviderId, key: string) {
      await invoke("secret_set", { provider, key });
    },
    async hasKey(provider: ProviderId) {
      return invoke<boolean>("secret_has", { provider });
    },
    async clearKey(provider: ProviderId) {
      await invoke("secret_clear", { provider });
    },
  };
}
