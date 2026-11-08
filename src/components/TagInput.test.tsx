// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import "../i18n";
import type { Tag } from "../core/tags";
import { TagInput } from "./TagInput";

afterEach(cleanup);

const known: Tag[] = [{ id: "1", name: "launch" }];

function Harness() {
  const [sel, setSel] = useState<Tag[]>([]);
  return (
    <TagInput
      selected={sel}
      known={known}
      onAdd={(name) => setSel((p) => [...p, { id: name, name }])}
      onRemove={(tag) => setSel((p) => p.filter((x) => x.id !== tag.id))}
    />
  );
}

describe("TagInput", () => {
  it("adds on Enter and removes with the x button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Add tag"), "tips{Enter}");
    expect(screen.getByText("#tips")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove tag tips" }));
    expect(screen.queryByText("#tips")).toBeNull();
  });
  it("suggests existing tags", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Add tag"), "la");
    await user.click(screen.getByRole("button", { name: "#launch" }));
    expect(screen.getByText("#launch")).toBeTruthy();
  });
});
