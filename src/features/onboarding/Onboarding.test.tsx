// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import i18n from "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Platform, ProviderId } from "../../platform/types";
import { chooseOption } from "../../test/select";
import { Onboarding } from "./Onboarding";
import { isOnboardingDone } from "./onboardingConfig";

const mock = vi.hoisted(() => ({ platform: {} as Partial<Platform> }));
vi.mock("../../platform", () => mock);
const { platform } = mock;

let keys: Set<ProviderId>;
beforeEach(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
  keys = new Set();
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
});
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

describe("Onboarding", () => {
  it("walks through the steps, stores a key and is not shown again", async () => {
    render(<Onboarding />);
    expect(await screen.findByText("Welcome to Cadence", { selector: "h2" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.type(await screen.findByLabelText("API key"), "sk-test");
    await userEvent.click(screen.getByRole("button", { name: "Save key" }));
    await waitFor(() => expect(keys.size).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Your first series (optional)")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await isOnboardingDone()).toBe(true);

    cleanup();
    render(<Onboarding />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("skip hides it for good", async () => {
    render(<Onboarding />);
    await userEvent.click(await screen.findByRole("button", { name: "Skip setup" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await isOnboardingDone()).toBe(true);
  });

  it("switching the language applies at once", async () => {
    render(<Onboarding />);
    await chooseOption("Language", "Türkçe");
    await waitFor(() => expect(i18n.language).toBe("tr"));
  });

  it("goes back and keeps entered values", async () => {
    render(<Onboarding />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    expect(screen.queryByRole("button", { name: "Skip this step" })).toBeTruthy();
    await userEvent.type(await screen.findByLabelText("API key"), "sk-keep");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Welcome to Cadence", { selector: "h2" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(((await screen.findByLabelText("API key")) as HTMLInputElement).value).toBe("sk-keep");
  });

  it("skips an optional step without saving it", async () => {
    render(<Onboarding />);
    await userEvent.click(await screen.findByRole("button", { name: "Next" }));
    await userEvent.type(await screen.findByLabelText("API key"), "sk-unsaved");
    await userEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    expect(await screen.findByText("Your first series (optional)")).toBeTruthy();
    expect(keys.size).toBe(0);
    await userEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await isOnboardingDone()).toBe(true);
  });

  it("Enter runs the primary action and focus moves to the heading", async () => {
    render(<Onboarding />);
    const h = await screen.findByText("Welcome to Cadence", { selector: "h2" });
    await waitFor(() => expect(document.activeElement).toBe(h));
    await userEvent.keyboard("{Enter}");
    const h2 = await screen.findByText("Writing help (optional)");
    await waitFor(() => expect(document.activeElement).toBe(h2));
  });
});
