import { describe, expect, it } from "vitest";
import { consumeCaptureFocus, onCaptureFocusRequest, requestCaptureFocus } from "./captureFocus";

describe("capture focus requests", () => {
  it("stays pending until consumed, once", () => {
    requestCaptureFocus();
    expect(consumeCaptureFocus()).toBe(true);
    expect(consumeCaptureFocus()).toBe(false);
  });
  it("notifies listeners until they unsubscribe", () => {
    let calls = 0;
    const off = onCaptureFocusRequest(() => calls++);
    requestCaptureFocus();
    off();
    requestCaptureFocus();
    expect(calls).toBe(1);
    consumeCaptureFocus();
  });
});
