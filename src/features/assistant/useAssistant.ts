import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AiCommand } from "../../core/commands";
import { commandsFor } from "../../core/commands";
import type { FieldSchema } from "../../core/fieldSchema";
import { buildPrompt, parseOptions } from "../../core/prompt";
import { createCommandsRepository } from "../../db/repositories/commands";
import { platform } from "../../platform";
import { type AiConfig, loadAiConfig } from "../settings/aiConfig";
import { onAiSettingsChanged } from "../settings/aiEvents";

export interface ResultCard {
  id: number;
  text: string;
}

export interface AssistantInput {
  contentTypeId: string | undefined;
  contentTypeName: string | undefined;
  schema: FieldSchema;
  values: Record<string, unknown>;
}

/** Provider errors arrive as `{kind, message}`; anything else is "unknown". */
export function errorKind(error: unknown): string {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const kind = (error as { kind: unknown }).kind;
    if (typeof kind === "string") return kind;
  }
  return "unknown";
}

export function useAssistant(input: AssistantInput) {
  const repo = useMemo(() => createCommandsRepository(platform.database), []);
  const [commands, setCommands] = useState<AiCommand[]>([]);
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [cards, setCards] = useState<ResultCard[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const nextId = useRef(1);
  const latest = useRef(input);
  latest.current = input;

  useEffect(() => {
    let alive = true;
    const load = () => {
      repo
        .list()
        .then((c) => alive && setCommands(c))
        .catch(() => {});
      loadAiConfig()
        .then((c) => alive && setConfig(c))
        .catch(() => {});
    };
    load();
    const off = onAiSettingsChanged(load);
    return () => {
      alive = false;
      off();
    };
  }, [repo]);

  const cancel = useCallback(() => {
    run.current += 1;
    setRunning(false);
  }, []);

  // Leaving the screen stops a request that is still streaming.
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const send = useCallback(
    async (command: AiCommand | null, freeText: string) => {
      if (!config) return;
      const cmd = command?.prompt ?? "";
      if (!cmd && !freeText.trim()) return;
      const mine = ++run.current;
      const { contentTypeName, schema, values } = latest.current;
      const built = buildPrompt({
        tone: config.tone,
        ...(contentTypeName ? { contentTypeName } : {}),
        schema,
        values: values as never,
        commandPrompt: cmd || freeText,
        ...(cmd ? { freeText } : {}),
        expectsOptions: command?.returnsOptions ?? false,
      });
      setError(null);
      setRunning(true);
      let text = "";
      const live = nextId.current++;
      try {
        const stream = platform.ai.complete({
          provider: config.provider,
          model: config.model,
          system: built.system,
          prompt: built.prompt,
          ...(config.provider === "ollama" ? { baseUrl: config.ollamaUrl } : {}),
        });
        for await (const chunk of stream) {
          // A newer request or Cancel bumps the counter; leaving the loop cancels in Rust.
          if (run.current !== mine) return;
          text += chunk;
          if (!command?.returnsOptions) {
            setCards((prev) => [{ id: live, text }, ...prev.filter((c) => c.id !== live)]);
          }
        }
        if (run.current !== mine) return;
        if (command?.returnsOptions) {
          const options = parseOptions(text).map((o) => ({ id: nextId.current++, text: o }));
          setCards((prev) => [...options, ...prev]);
        }
      } catch (e) {
        if (run.current === mine) setError(errorKind(e));
      } finally {
        if (run.current === mine) setRunning(false);
      }
    },
    [config],
  );

  const available = input.contentTypeId ? commandsFor(commands, input.contentTypeId) : [];
  const discard = useCallback((id: number) => setCards((p) => p.filter((c) => c.id !== id)), []);

  return { available, config, cards, running, error, send, cancel, discard };
}
