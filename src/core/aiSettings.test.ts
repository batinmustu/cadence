import { describe, expect, it } from "vitest";
import {
  aiStatus,
  defaultModel,
  isAiAvailable,
  MAX_TONE_LENGTH,
  modelOrDefault,
  normalizeTone,
  parseProvider,
} from "./aiSettings";

describe("aiSettings", () => {
  it("falls back to anthropic for unknown providers", () => {
    expect(parseProvider("openai")).toBe("openai");
    expect(parseProvider("nope")).toBe("anthropic");
    expect(parseProvider(null)).toBe("anthropic");
  });

  it("picks the first suggested model as default", () => {
    expect(defaultModel("anthropic")).toBe("claude-sonnet-5-5");
    expect(defaultModel("ollama")).toBe("");
    expect(modelOrDefault("openai", "  ")).toBe("gpt-4o");
    expect(modelOrDefault("openai", " x ")).toBe("x");
  });

  it("trims and caps the tone note", () => {
    expect(normalizeTone("  warm  ")).toBe("warm");
    expect(normalizeTone("a".repeat(MAX_TONE_LENGTH + 5))).toHaveLength(MAX_TONE_LENGTH);
  });

  it("derives connection status", () => {
    const base = { provider: "anthropic", model: "m", hasKey: true, verified: false } as const;
    expect(aiStatus(base)).toEqual({ state: "connected", provider: "anthropic", model: "m" });
    expect(aiStatus({ ...base, hasKey: false }).state).toBe("notConnected");
    expect(aiStatus({ ...base, model: "" }).state).toBe("notConnected");
    expect(aiStatus({ ...base, provider: "ollama", hasKey: true }).state).toBe("notConnected");
    expect(aiStatus({ ...base, provider: "ollama", verified: true }).state).toBe("connected");
  });
});

describe("isAiAvailable", () => {
  it("is true only for a connected provider", () => {
    expect(isAiAvailable({ state: "notConnected" })).toBe(false);
    expect(
      isAiAvailable(
        aiStatus({ provider: "anthropic", model: "m", hasKey: false, verified: false }),
      ),
    ).toBe(false);
    expect(
      isAiAvailable(aiStatus({ provider: "anthropic", model: "m", hasKey: true, verified: false })),
    ).toBe(true);
    expect(
      isAiAvailable(aiStatus({ provider: "ollama", model: "m", hasKey: false, verified: false })),
    ).toBe(false);
    expect(
      isAiAvailable(aiStatus({ provider: "ollama", model: "m", hasKey: false, verified: true })),
    ).toBe(true);
  });
});
