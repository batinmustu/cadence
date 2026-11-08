// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { FieldSchema } from "../../core/fieldSchema";
import { prepareDatabase } from "../../db";
import "../../i18n";
import { createSqlJsDatabase } from "../../platform/browser/sqljs";
import type { AIRequest, Platform } from "../../platform/types";
import { AssistantPanel } from "./AssistantPanel";

const mock = vi.hoisted(() => ({ platform: {} as Partial<Platform> }));
vi.mock("../../platform", () => mock);
const { platform } = mock;

const schema: FieldSchema = { fields: [{ kind: "longtext", key: "body" }] };
const requests: AIRequest[] = [];
let behaviour: (r: AIRequest) => AsyncIterable<string>;
let typeId = "";

beforeAll(async () => {
  platform.database = await createSqlJsDatabase();
  await prepareDatabase(platform.database);
  const [row] = await platform.database.select<{ id: string }>(
    "SELECT id FROM content_types WHERE name = 'Post' LIMIT 1",
  );
  typeId = row?.id ?? "";
  platform.secrets = {
    async setKey() {},
    async hasKey() {
      return true;
    },
    async clearKey() {},
  };
  platform.ai = {
    complete(r) {
      requests.push(r);
      return behaviour(r);
    },
    testConnection: async () => true,
  };
});
afterEach(() => {
  cleanup();
  requests.length = 0;
});

const panel = (onApply = vi.fn()) =>
  render(
    <AssistantPanel
      contentTypeId={typeId}
      contentTypeName="Post"
      schema={schema}
      values={{ body: "Hello world" }}
      onApply={onApply}
    />,
  );

describe("AssistantPanel", () => {
  it("runs a command, shows a card and applies it", async () => {
    behaviour = async function* () {
      yield "Short ";
      yield "version";
    };
    const onApply = vi.fn();
    panel(onApply);
    await userEvent.click(await screen.findByRole("button", { name: "Shorten" }));
    expect(await screen.findByText("Short version")).toBeTruthy();
    expect(requests[0]?.prompt).toContain("Hello world");
    await userEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(onApply).toHaveBeenCalledWith("replace", "Short version");
    await userEvent.click(screen.getByRole("button", { name: "Insert below" }));
    expect(onApply).toHaveBeenLastCalledWith("insertBelow", "Short version");
  });

  it("sends free text on its own", async () => {
    behaviour = async function* () {
      yield "Done";
    };
    panel();
    await userEvent.type(await screen.findByLabelText("Ask the assistant"), "Make it funny{Enter}");
    await screen.findByText("Done");
    expect(requests[0]?.prompt).toContain("Make it funny");
  });

  it("shows an inline error", async () => {
    behaviour = async function* () {
      yield "";
      throw { kind: "auth", message: "bad key" };
    };
    panel();
    await userEvent.type(await screen.findByLabelText("Ask the assistant"), "hi{Enter}");
    expect((await screen.findByRole("alert")).textContent).toContain("rejected the API key");
  });

  it("cancels a streaming request", async () => {
    let released!: () => void;
    const gate = new Promise<void>((r) => {
      released = r;
    });
    behaviour = async function* () {
      yield "partial";
      await gate;
      yield " late";
    };
    panel();
    await userEvent.type(await screen.findByLabelText("Ask the assistant"), "go{Enter}");
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    released();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull());
    expect(screen.queryByText("partial late")).toBeNull();
  });
});
