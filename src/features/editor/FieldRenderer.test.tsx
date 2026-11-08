// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { FieldSchema } from "../../core/fieldSchema";
import "../../i18n";
import { FieldRenderer } from "./FieldRenderer";

afterEach(cleanup);

function Harness({
  schema,
  initial = {},
}: {
  schema: FieldSchema;
  initial?: Record<string, unknown>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  return (
    <>
      <FieldRenderer
        schema={schema}
        values={values}
        onChange={(k, v) => setValues({ ...values, [k]: v })}
      />
      <output data-testid="state">{JSON.stringify(values)}</output>
    </>
  );
}
const state = () => JSON.parse(screen.getByTestId("state").textContent ?? "{}");

describe("FieldRenderer", () => {
  it("edits text with a counter", async () => {
    render(<Harness schema={{ fields: [{ key: "title", kind: "text", max: 5 }] }} />);
    await userEvent.type(screen.getByLabelText("title"), "abcdefg");
    expect(state()).toEqual({ title: "abcdefg" });
    expect(screen.getByText("7 / 5").dataset.over).toBe("true");
  });

  it("edits longtext", async () => {
    render(<Harness schema={{ fields: [{ key: "body", kind: "longtext", max: 100 }] }} />);
    await userEvent.type(screen.getByLabelText("body"), "hi");
    expect(state()).toEqual({ body: "hi" });
    expect(screen.getByText("2 / 100").dataset.over).toBe("false");
  });

  it("adds, edits, reorders and removes parts", async () => {
    const schema: FieldSchema = {
      fields: [{ key: "t", kind: "parts", maxPerPart: 10, maxParts: 3 }],
    };
    render(<Harness schema={schema} initial={{ t: ["one", "two"] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Move part 2 up" }));
    expect(state().t).toEqual(["two", "one"]);
    await userEvent.click(screen.getByRole("button", { name: "Part" }));
    expect((screen.getByRole("button", { name: "Part" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(screen.getByLabelText("t part 3"), "x");
    expect(state().t).toEqual(["two", "one", "x"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove part 1" }));
    expect(state().t).toEqual(["one", "x"]);
  });

  it("marks over-limit parts and splits them at sentences", async () => {
    const schema: FieldSchema = { fields: [{ key: "t", kind: "parts", maxPerPart: 12 }] };
    render(<Harness schema={schema} initial={{ t: ["Hello you. Second one."] }} />);
    expect(screen.getByTestId("part").dataset.over).toBe("true");
    await userEvent.click(
      screen.getByRole("button", { name: "Split part 1 at sentence boundaries" }),
    );
    expect(state().t).toEqual(["Hello you.", "Second one."]);
    for (const p of screen.getAllByTestId("part")) expect(p.dataset.over).toBe("false");
  });

  it("edits outline rows with timestamps", async () => {
    render(<Harness schema={{ fields: [{ key: "script", kind: "outline" }] }} />);
    await userEvent.click(screen.getByRole("button", { name: "Row" }));
    await userEvent.type(screen.getByLabelText("script row 1"), "Intro");
    await userEvent.type(screen.getByLabelText("Timestamp 1"), "0:30");
    expect(state().script).toEqual([{ text: "Intro", timestamp: "0:30" }]);
    await userEvent.clear(screen.getByLabelText("Timestamp 1"));
    expect(state().script).toEqual([{ text: "Intro" }]);
    await userEvent.click(screen.getByRole("button", { name: "Remove row 1" }));
    expect(state().script).toEqual([]);
  });

  it("toggles checklist items", async () => {
    const schema: FieldSchema = {
      fields: [{ key: "prod", kind: "checklist", items: ["Script", "Shoot"] }],
    };
    render(<Harness schema={schema} />);
    await userEvent.click(screen.getByRole("button", { name: "Shoot" }));
    expect(state().prod).toEqual({ Shoot: true });
    expect(screen.getByRole("button", { name: "Shoot" })).toHaveProperty("ariaPressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Shoot" }));
    expect(state().prod).toEqual({ Shoot: false });
  });

  it("tolerates stored values of the wrong shape", () => {
    render(<Harness schema={{ fields: [{ key: "t", kind: "parts" }] }} initial={{ t: 5 }} />);
    expect(screen.getByLabelText("t part 1")).toBeTruthy();
  });
});
