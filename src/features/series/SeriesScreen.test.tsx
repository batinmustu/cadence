// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createSeriesRepository } from "../../db/repositories/series";
import "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { AI, Database, Secrets } from "../../platform/types";
import { chooseOption } from "../../test/select";
import { SeriesScreen } from "./SeriesScreen";

// The browser adapter fetches the sql.js wasm over HTTP, which jsdom cannot do;
// the Node-side loader gives the same in-memory SQLite.
const mock = vi.hoisted(() => ({
  platform: {} as { database: Database; secrets: Secrets; ai: AI },
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mock.navigate }));
vi.mock("../../platform", () => mock);
const { platform } = mock;

afterEach(cleanup);
beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
  platform.secrets = {
    setKey: async () => {},
    hasKey: async () => true,
    clearKey: async () => {},
  };
  platform.ai = {
    async *complete() {
      yield "Focus sprint\n\nWork in 25 minute blocks.";
    },
    testConnection: async () => true,
  };
});

async function setup() {
  const [p] = await platform.database.select<{ id: string }>(
    "SELECT id FROM platforms ORDER BY sort_order LIMIT 1",
  );
  const series = await createSeriesRepository(platform.database).create({
    name: "Daily tips",
    platformId: p?.id ?? "",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  });
  const idea = await createIdeasRepository(platform.database).create({
    title: "Tip about focus",
    seriesId: series.id,
  });
  return { series, idea };
}

describe("SeriesScreen", () => {
  it("shows empty slots and fills one by assigning an idea", async () => {
    const { series } = await setup();
    render(<SeriesScreen seriesId={series.id} />);
    expect(await screen.findByRole("heading", { name: "Daily tips" })).toBeTruthy();
    await waitFor(() => expect(screen.getAllByTestId("slot-empty").length).toBeGreaterThan(0));

    await userEvent.click(screen.getAllByRole("button", { name: "Assign idea" })[0] as HTMLElement);
    await chooseOption("Choose an idea", "Tip about focus");

    await waitFor(() => expect(screen.getAllByTestId("slot-filled").length).toBe(1));
    expect(screen.getAllByText("Tip about focus").length).toBeGreaterThan(0);
  });

  it("autosaves settings on leave", async () => {
    const { series } = await setup();
    const { unmount } = render(<SeriesScreen seriesId={series.id} />);
    const name = await screen.findByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Renamed");
    unmount();
    await waitFor(async () =>
      expect((await createSeriesRepository(platform.database).get(series.id))?.name).toBe(
        "Renamed",
      ),
    );
  });

  it("creates a tagged, scheduled AI draft in an empty slot and opens it", async () => {
    const { series } = await setup();
    render(<SeriesScreen seriesId={series.id} />);
    await waitFor(() => expect(screen.getAllByTestId("slot-empty").length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByRole("button", { name: "AI draft" })[0] as HTMLElement);

    await waitFor(() => expect(mock.navigate).toHaveBeenCalled());
    const [row] = await platform.database.select<{ title: string; name: string; status: string }>(
      `SELECT i.title, t.name, p.status FROM ideas i
       JOIN posts p ON p.idea_id = i.id
       JOIN idea_tags it ON it.idea_id = i.id JOIN tags t ON t.id = it.tag_id
       WHERE i.title = 'Focus sprint'`,
    );
    expect(row).toEqual({ title: "Focus sprint", name: "AI draft", status: "scheduled" });
    await waitFor(() => expect(screen.getAllByTestId("slot-filled").length).toBe(1));
  });
});
