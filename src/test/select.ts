import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom lacks the pointer APIs Radix Select relies on.
const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
proto.hasPointerCapture ??= () => false;
proto.setPointerCapture ??= () => {};
proto.releasePointerCapture ??= () => {};
proto.scrollIntoView ??= () => {};

/** Opens the Select with the given label and picks the option with that text. */
export async function chooseOption(label: string, option: string | RegExp) {
  await userEvent.click(await screen.findByLabelText(label));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}
