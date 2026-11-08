// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import i18n from "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { GeneralSettings } from "./GeneralSettings";
import { loadGeneralConfig } from "./generalConfig";

const mock = vi.hoisted(() => ({
  platform: {} as {
    database: Database;
    window: { setQuickCaptureShortcut: (a: string) => Promise<void> };
  },
  bind: vi.fn<(a: string) => Promise<void>>(),
}));
vi.mock("../../platform", () => mock);
const { platform } = mock;

afterEach(async () => {
  cleanup();
  mock.bind.mockReset();
  await i18n.changeLanguage("en");
});
beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
  platform.window = { setQuickCaptureShortcut: (a) => mock.bind(a) };
});

describe("GeneralSettings", () => {
  it("switches language and week start and stores them", async () => {
    render(<GeneralSettings />);
    await userEvent.selectOptions(await screen.findByLabelText("Language"), "tr");
    await waitFor(() => expect(i18n.language).toBe("tr"));
    await userEvent.selectOptions(await screen.findByLabelText("Hafta şu günle başlar"), "sunday");
    await waitFor(async () => {
      const c = await loadGeneralConfig();
      expect(c.language).toBe("tr");
      expect(c.weekStart).toBe("sunday");
    });
  });

  it("records a new shortcut, binds it and stores it", async () => {
    mock.bind.mockResolvedValue();
    render(<GeneralSettings />);
    const button = await screen.findByRole("button", { name: /Quick capture shortcut/ });
    await userEvent.click(button);
    fireEvent.keyDown(button, { key: "k", ctrlKey: true, shiftKey: true });
    await waitFor(() => expect(mock.bind).toHaveBeenCalledWith("Ctrl+Shift+K"));
    await waitFor(async () =>
      expect((await loadGeneralConfig()).captureShortcut).toBe("Ctrl+Shift+K"),
    );
  });

  it("keeps the old shortcut when binding fails", async () => {
    mock.bind.mockRejectedValue({ kind: "register" });
    render(<GeneralSettings />);
    const button = await screen.findByRole("button", { name: /Quick capture shortcut/ });
    const before = (await loadGeneralConfig()).captureShortcut;
    await userEvent.click(button);
    fireEvent.keyDown(button, { key: "j", altKey: true });
    expect((await screen.findByRole("alert")).textContent).toContain("previous shortcut");
    expect((await loadGeneralConfig()).captureShortcut).toBe(before);
  });
});
