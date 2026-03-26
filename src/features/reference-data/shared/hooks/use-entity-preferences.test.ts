import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/hooks/use-user-meta", () => ({
  getUserMeta: vi.fn(),
  patchUserMeta: vi.fn(),
}));

import { renderHook } from "@/test-utils";
import { getUserMeta } from "@/shared/hooks/use-user-meta";
import {
  getSavedEntityTableLayout,
  getSavedEntityFormTabOrder,
  useEntityPreferences,
} from "./use-entity-preferences";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-entity-preferences", () => {
  it("exports getSavedEntityTableLayout", () => {
    expect(getSavedEntityTableLayout).toBeTypeOf("function");
  });

  it("exports getSavedEntityFormTabOrder", () => {
    expect(getSavedEntityFormTabOrder).toBeTypeOf("function");
  });

  it("exports useEntityPreferences hook", () => {
    expect(useEntityPreferences).toBeTypeOf("function");
  });

  it("getSavedEntityTableLayout returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);

    const result = getSavedEntityTableLayout("Product");
    expect(result).toBeNull();
  });

  it("getSavedEntityTableLayout returns layout from meta", () => {
    const layout = { columns: ["name", "sku"], widths: {} };
    vi.mocked(getUserMeta).mockReturnValue({
      ProductTableLayout: layout,
    });

    const result = getSavedEntityTableLayout("Product");
    expect(result).toEqual(layout);
  });

  it("getSavedEntityFormTabOrder returns null when no meta", () => {
    vi.mocked(getUserMeta).mockReturnValue(null);

    const result = getSavedEntityFormTabOrder("Location");
    expect(result).toBeNull();
  });

  it("getSavedEntityFormTabOrder returns array from meta", () => {
    vi.mocked(getUserMeta).mockReturnValue({
      LocationFormTabOrder: ["general", "address"],
    });

    const result = getSavedEntityFormTabOrder("Location");
    expect(result).toEqual(["general", "address"]);
  });

  it("useEntityPreferences returns save functions", () => {
    const { result } = renderHook(() => useEntityPreferences("Product"));

    expect(result.current.saveTableLayout).toBeTypeOf("function");
    expect(result.current.saveFormTabOrder).toBeTypeOf("function");
  });
});
