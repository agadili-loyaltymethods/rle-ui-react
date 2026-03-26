import { describe, expect, it } from "vitest";
import { handleOpenAutoFocus, handleAutoSelectOnFocus } from "./focus-utils";

describe("focus-utils module", () => {
  it("exports handleOpenAutoFocus as a function", () => {
    expect(typeof handleOpenAutoFocus).toBe("function");
  });

  it("exports handleAutoSelectOnFocus as a function", () => {
    expect(typeof handleAutoSelectOnFocus).toBe("function");
  });
});

describe("handleOpenAutoFocus", () => {
  it("calls preventDefault on the event", () => {
    const event = {
      preventDefault: vi.fn(),
      currentTarget: document.createElement("div"),
    } as unknown as Event;

    handleOpenAutoFocus(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});
