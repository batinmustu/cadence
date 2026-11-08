// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Textarea } from "./ui/textarea";

const LINE = 20;

beforeAll(() => {
  // jsdom does no layout: derive scrollHeight from the number of lines.
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      return Math.max(1, this.value.split("\n").length) * LINE;
    },
  });
  window.getComputedStyle = (() => ({
    lineHeight: `${LINE}px`,
    fontSize: "14px",
    paddingTop: "0px",
    paddingBottom: "0px",
    borderTopWidth: "0px",
    borderBottomWidth: "0px",
  })) as unknown as typeof window.getComputedStyle;
});
afterEach(cleanup);

function Harness({ maxRows }: { maxRows?: number }) {
  const [v, setV] = useState("");
  return (
    <>
      <Textarea
        aria-label="t"
        minRows={2}
        maxRows={maxRows}
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button type="button" onClick={() => setV("a\nb\nc\nd")}>
        fill
      </button>
    </>
  );
}

const height = () => (screen.getByLabelText("t") as HTMLTextAreaElement).style.height;

describe("Textarea", () => {
  it("starts at minRows and grows with typed content", async () => {
    render(<Harness />);
    expect(height()).toBe("40px");
    await userEvent.type(screen.getByLabelText("t"), "1{Enter}2{Enter}3{Enter}4{Enter}5");
    expect(height()).toBe("100px");
  });

  it("grows on programmatic value changes", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText("fill"));
    expect(height()).toBe("80px");
  });

  it("stops at maxRows and scrolls", async () => {
    render(<Harness maxRows={3} />);
    await userEvent.click(screen.getByText("fill"));
    expect(height()).toBe("60px");
    expect((screen.getByLabelText("t") as HTMLTextAreaElement).style.overflowY).toBe("auto");
  });
});
