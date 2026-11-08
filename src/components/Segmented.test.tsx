// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Segmented } from "./Segmented";

afterEach(cleanup);

function Harness() {
  const [v, setV] = useState("all");
  return (
    <Segmented
      label="Filter"
      value={v}
      onChange={setV}
      options={[
        { value: "all", label: "All" },
        { value: "draft", label: "Draft" },
      ]}
    />
  );
}

describe("Segmented", () => {
  it("moves the selection and keeps exactly one indicator", async () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "Draft" }));
    expect(screen.getByRole("radio", { name: "Draft" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "All" }).getAttribute("aria-checked")).toBe("false");
    expect(document.querySelectorAll("[data-slot=segmented-indicator]")).toHaveLength(1);
  });
});
