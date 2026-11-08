import { describe, expect, it } from "vitest";
import { sidebarTopInset } from "./sidebarInset";

describe("sidebarTopInset", () => {
  it("reserves room for the traffic lights on macOS in a window", () => {
    expect(sidebarTopInset("macos", false)).toBe(48);
  });
  it("moves items up in full screen", () => {
    expect(sidebarTopInset("macos", true)).toBeLessThan(sidebarTopInset("macos", false));
  });
  it("never reserves room on other platforms", () => {
    expect(sidebarTopInset("web", false)).toBe(sidebarTopInset("macos", true));
  });
});
