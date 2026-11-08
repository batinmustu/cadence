// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prepareDatabase } from "../../db";
import { createIdeasRepository } from "../../db/repositories/ideas";
import { createPostsRepository } from "../../db/repositories/posts";
import { createSeriesRepository } from "../../db/repositories/series";
import "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { Database } from "../../platform/types";
import { CalendarScreen } from "./CalendarScreen";

const mock = vi.hoisted(() => ({ platform: {} as { database: Database } }));
vi.mock("../../platform", () => mock);
// Links need a router; plain anchors are enough to check what is rendered.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a href="/x" className={className}>
      {children}
    </a>
  ),
}));
const { platform } = mock;

afterEach(cleanup);
beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
});

describe("CalendarScreen", () => {
  it("shows planned posts and empty series slots, and navigates months", async () => {
    const [p] = await platform.database.select<{ id: string }>(
      "SELECT id FROM platforms ORDER BY sort_order LIMIT 1",
    );
    const [ct] = await platform.database.select<{ id: string }>(
      "SELECT id FROM content_types WHERE platform_id = ? LIMIT 1",
      [p?.id ?? ""],
    );
    const idea = await createIdeasRepository(platform.database).create({ title: "Planned thing" });
    const posts = createPostsRepository(platform.database);
    const post = await posts.create({ ideaId: idea.id, contentTypeId: ct?.id ?? "" });
    const when = new Date();
    when.setDate(when.getDate() + 1);
    await posts.update(post.id, { status: "scheduled", scheduledAt: when.toISOString() });
    await createSeriesRepository(platform.database).create({
      name: "Daily tips",
      platformId: p?.id ?? "",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
    });

    render(<CalendarScreen />);
    expect(screen.getAllByTestId("calendar-day")).toHaveLength(42);
    await waitFor(() => expect(screen.getByText("Planned thing")).toBeTruthy());
    expect(screen.getAllByText("Daily tips · empty").length).toBeGreaterThan(0);

    const heading = screen.getByRole("heading", { level: 1 }).textContent;
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe(heading);
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(heading);
  });

  it("schedules an unscheduled idea through the keyboard-accessible picker", async () => {
    await createIdeasRepository(platform.database).create({ title: "Loose idea" });
    render(<CalendarScreen />);
    await userEvent.selectOptions(await screen.findByLabelText("Choose an idea"), "Loose idea");
    await userEvent.click(screen.getByRole("button", { name: "Choose date…" }));
    const dialog = screen.getByRole("dialog");
    const next = new Date();
    next.setDate(next.getDate() + 2);
    const date = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    fireEvent.change(within(dialog).getByLabelText("Date"), { target: { value: date } });
    await userEvent.click(within(dialog).getByRole("button", { name: "Schedule" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [row] = await platform.database.select<{ status: string }>(
      "SELECT p.status FROM posts p JOIN ideas i ON i.id = p.idea_id WHERE i.title = 'Loose idea'",
    );
    expect(row?.status).toBe("scheduled");
  });
});
