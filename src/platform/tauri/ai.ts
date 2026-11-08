import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AI, AIRequest } from "../types";

interface ChunkEvent {
  requestId: string;
  chunk: string;
}

/** Streams text from the Rust AI layer. The key is read there; it never reaches this process. */
export function createTauriAI(): AI {
  return {
    async *complete(request: AIRequest) {
      const requestId = crypto.randomUUID();
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      let finished = false;
      let failure: unknown = null;
      const poke = () => {
        wake?.();
        wake = null;
      };
      const offChunk = await listen<ChunkEvent>("ai-chunk", (e) => {
        if (e.payload.requestId !== requestId) return;
        queue.push(e.payload.chunk);
        poke();
      });
      invoke("ai_complete", { requestId, request })
        .catch((error: unknown) => {
          failure = error;
        })
        .finally(() => {
          finished = true;
          poke();
        });
      try {
        for (;;) {
          const next = queue.shift();
          if (next !== undefined) {
            yield next;
          } else if (finished) {
            break;
          } else {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
          }
        }
        if (failure) throw failure;
      } finally {
        offChunk();
        // Leaving the loop early (the consumer stopped) cancels the request in Rust.
        if (!finished) void invoke("ai_cancel", { requestId });
      }
    },
    async testConnection(provider, baseUrl) {
      try {
        await invoke("ai_test", { provider, baseUrl: baseUrl ?? null });
        return true;
      } catch {
        return false;
      }
    },
  };
}
