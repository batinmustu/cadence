import { describe, expect, it } from "vitest";
import { matchesShortcut } from "./shortcut";

const ev = (o: Partial<Parameters<typeof matchesShortcut>[0]>) => ({
  key: "s",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...o,
});

describe("matchesShortcut", () => {
  it("matches Ctrl+Cmd+S exactly", () => {
    expect(matchesShortcut(ev({ ctrlKey: true, metaKey: true }), "Ctrl+Cmd+S")).toBe(true);
    expect(matchesShortcut(ev({ ctrlKey: true }), "Ctrl+Cmd+S")).toBe(false);
    expect(
      matchesShortcut(ev({ ctrlKey: true, metaKey: true, shiftKey: true }), "Ctrl+Cmd+S"),
    ).toBe(false);
  });
  it("is case-insensitive on the key", () => {
    expect(matchesShortcut(ev({ key: "B", ctrlKey: true }), "Ctrl+B")).toBe(true);
  });
});
