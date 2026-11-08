import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  platform: { window: { startDragging: vi.fn(), toggleMaximize: vi.fn() } },
}));
vi.mock("../../platform", () => mock);

import { onTitleBarMouseDown } from "./useWindowDrag";

const { startDragging, toggleMaximize } = mock.platform.window;
const el = new EventTarget();
const press = (over: { button?: number; detail?: number; target?: EventTarget }) =>
  onTitleBarMouseDown({
    button: 0,
    detail: 1,
    target: el,
    currentTarget: el,
    ...over,
  });

beforeEach(() => vi.clearAllMocks());

describe("onTitleBarMouseDown", () => {
  it("starts dragging on empty space", () => {
    press({});
    expect(startDragging).toHaveBeenCalledOnce();
  });
  it("maximises on double click", () => {
    press({ detail: 2 });
    expect(toggleMaximize).toHaveBeenCalledOnce();
    expect(startDragging).not.toHaveBeenCalled();
  });
  it("ignores presses on child controls and other buttons", () => {
    press({ target: new EventTarget() });
    press({ button: 2 });
    expect(startDragging).not.toHaveBeenCalled();
  });
});
