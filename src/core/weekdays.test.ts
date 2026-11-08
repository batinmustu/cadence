import { describe, expect, it } from "vitest";
import { rhythmLabel } from "./weekdays";

describe("rhythmLabel", () => {
  it("sorts and dedupes weekdays, dropping invalid ones", () => {
    expect(rhythmLabel([3, 0, 3, 9], "weekly")).toEqual({ kind: "weekdays", days: ["sun", "wed"] });
  });
  it("uses short labels for biweekly and monthly", () => {
    expect(rhythmLabel([1], "biweekly")).toEqual({ kind: "biweekly" });
    expect(rhythmLabel([1], "monthly")).toEqual({ kind: "monthly" });
  });
});
