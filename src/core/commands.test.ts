import { describe, expect, it } from "vitest";
import { type AiCommand, commandsFor, validateCommand } from "./commands";

const cmd = (id: string, contentTypeId: string | null): AiCommand => ({
  id,
  name: id,
  prompt: "p",
  contentTypeId,
  sortOrder: 0,
  isPreset: false,
  returnsOptions: false,
});

describe("commands", () => {
  it("filters by content type", () => {
    const all = [cmd("a", null), cmd("b", "t1"), cmd("c", "t2")];
    expect(commandsFor(all, "t1").map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("validates name and prompt", () => {
    const ok = { name: "x", prompt: "y", contentTypeId: null, returnsOptions: false };
    expect(validateCommand(ok)).toBeNull();
    expect(validateCommand({ ...ok, name: " " })).toBe("name");
    expect(validateCommand({ ...ok, prompt: "" })).toBe("prompt");
  });
});
