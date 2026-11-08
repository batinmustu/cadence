// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import { createPlatformsRepository } from "../../db/repositories/platforms";
import "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { chooseOption } from "../../test/select";
import { PlatformsSettings } from "./PlatformsSettings";

const mock = vi.hoisted(() => ({ platform: {} as { database: Database } }));
vi.mock("../../platform", () => mock);
const { platform } = mock;

afterEach(cleanup);
beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
});

describe("PlatformsSettings", () => {
  it("adds a platform with a validated content type", async () => {
    render(<PlatformsSettings />);
    await userEvent.type(await screen.findByLabelText("New platform"), "Blog{Enter}");
    await screen.findByDisplayValue("Blog");

    await userEvent.click(await screen.findByRole("button", { name: "Add content type" }));
    await userEvent.type(screen.getByLabelText("Name"), "Article");
    await chooseOption("Kind of new field", "Long text");
    await userEvent.click(screen.getByRole("button", { name: "Add field" }));

    // An invalid limit is caught by the schema validator before anything is saved.
    const limit = screen.getByLabelText("Limit of field 1");
    await userEvent.type(limit, "0");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("not valid");

    await userEvent.clear(limit);
    await userEvent.type(limit, "500");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Article");

    const repo = createPlatformsRepository(platform.database);
    const blog = (await repo.list()).find((p) => p.name === "Blog");
    const [type] = await repo.listContentTypes(blog?.id ?? "");
    expect(type?.schema.fields[0]).toMatchObject({ kind: "longtext", max: 500 });
  });

  it("hides a preset platform but offers no delete for it", async () => {
    render(<PlatformsSettings />);
    await userEvent.click(await screen.findByRole("button", { name: "Hide X" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Show X" })).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Delete X" })).toBeNull();
    const visible = await createPlatformsRepository(platform.database).listVisible();
    expect(visible.map((p) => p.name)).not.toContain("X");
    await userEvent.click(screen.getByRole("button", { name: "Show X" }));
  });

  it("refuses to delete a platform that is in use and says why", async () => {
    const repo = createPlatformsRepository(platform.database);
    const p = await repo.create("Used");
    await platform.database.execute(
      "INSERT INTO series (id, name, platform_id, weekdays, time, frequency, anchor_date, template, remind_before_hours, created_at, updated_at) VALUES ('s1','S',?, '[]','09:00','weekly','2026-01-01','',0,'2026-01-01','2026-01-01')",
      [p.id],
    );
    render(<PlatformsSettings />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Used" }));
    const note = await screen.findByRole("status");
    expect(within(note.parentElement as HTMLElement).getByText(/cannot be deleted/)).toBeTruthy();
    expect((await repo.list()).map((x) => x.name)).toContain("Used");
  });
});
