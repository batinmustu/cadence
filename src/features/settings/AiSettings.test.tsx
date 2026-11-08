// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Platform, ProviderId } from "../../platform/types";
import { AiSettings } from "./AiSettings";
import { loadAiConfig } from "./aiConfig";

const mock = vi.hoisted(() => ({ platform: {} as Partial<Platform> }));
vi.mock("../../platform", () => mock);
const { platform } = mock;

afterEach(cleanup);
beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
  const keys = new Set<ProviderId>();
  platform.secrets = {
    async setKey(p) {
      keys.add(p);
    },
    async hasKey(p) {
      return keys.has(p);
    },
    async clearKey(p) {
      keys.delete(p);
    },
  };
  platform.ai = {
    // biome-ignore lint/correctness/useYield: unused in these tests
    async *complete() {
      return;
    },
    testConnection: async () => true,
  };
});

describe("AiSettings", () => {
  it("saves a write-only key, tests the connection and persists model and tone", async () => {
    render(<AiSettings />);
    const key = await screen.findByLabelText("API key");
    await userEvent.type(key, "sk-secret");
    await userEvent.click(screen.getByRole("button", { name: "Save key" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove key" })).toBeTruthy());
    // The saved key is never shown back.
    expect((screen.getByLabelText("API key") as HTMLInputElement).value).toBe("");

    await userEvent.click(screen.getByRole("button", { name: "Test" }));
    expect(await screen.findByText(/Connection works/)).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("Model"), "claude-opus-5-5");
    await userEvent.type(screen.getByLabelText("Tone of voice"), "  Warm and brief ");
    await userEvent.tab();

    await waitFor(async () => {
      const c = await loadAiConfig();
      expect(c.model).toBe("claude-opus-5-5");
      expect(c.tone).toBe("Warm and brief");
      expect(c.hasKey).toBe(true);
      expect(c.verified).toBe(true);
    });
  });

  it("disables Test until a key exists for key-based providers", async () => {
    render(<AiSettings />);
    await userEvent.click(await screen.findByRole("radio", { name: "OpenAI" }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Test" }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
    await userEvent.click(screen.getByRole("radio", { name: "Local (Ollama)" }));
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Test" }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
  });
});

describe("CommandsSettings in AI settings", () => {
  it("lists presets, adds and deletes a command", async () => {
    render(<AiSettings />);
    expect(await screen.findByText("Shorten")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await userEvent.type(screen.getByLabelText("Name"), "Punchier");
    await userEvent.type(screen.getByLabelText("Prompt"), "Make it punchier");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Punchier")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Delete Punchier" }));
    await waitFor(() => expect(screen.queryByText("Punchier")).toBeNull());
  });
});
