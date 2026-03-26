import { describe, it, expect } from "vitest";
import { renderHook, act } from "@/test-utils";
import { useColumnChooser, type ChooserColumn } from "./use-column-chooser";

const testColumns: ChooserColumn[] = [
  { key: "name", label: "Name", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: false },
];

describe("useColumnChooser", () => {
  it("returns columnOrder, activeColumns, and chooser state", () => {
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
      }),
    );

    expect(result.current.columnOrder).toHaveLength(3);
    expect(result.current.chooser).toBeDefined();
    expect(result.current.chooser.open).toBe(false);
    expect(typeof result.current.chooser.toggleColumn).toBe("function");
    expect(typeof result.current.chooser.setAllVisible).toBe("function");
    expect(typeof result.current.chooser.invertColumns).toBe("function");
  });

  it("initializes activeColumns from defaultVisible", () => {
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
      }),
    );

    // name and email are defaultVisible: true, status is false
    const activeKeys = result.current.activeColumns.map((c) => c.key);
    expect(activeKeys).toContain("name");
    expect(activeKeys).toContain("email");
    expect(activeKeys).not.toContain("status");
  });

  it("toggleColumn toggles a column's visibility", () => {
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
      }),
    );

    // Toggle status to visible
    act(() => result.current.chooser.toggleColumn("status"));
    let activeKeys = result.current.activeColumns.map((c) => c.key);
    expect(activeKeys).toContain("status");

    // Toggle status back to hidden
    act(() => result.current.chooser.toggleColumn("status"));
    activeKeys = result.current.activeColumns.map((c) => c.key);
    expect(activeKeys).not.toContain("status");
  });

  it("setAllVisible sets all columns visible or hidden", () => {
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
      }),
    );

    act(() => result.current.chooser.setAllVisible(true));
    expect(result.current.activeColumns).toHaveLength(3);

    act(() => result.current.chooser.setAllVisible(false));
    expect(result.current.activeColumns).toHaveLength(0);
  });

  it("invertColumns inverts visibility of all columns", () => {
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
      }),
    );

    // Initially: name=visible, email=visible, status=hidden
    act(() => result.current.chooser.invertColumns());

    // After invert: name=hidden, email=hidden, status=visible
    const activeKeys = result.current.activeColumns.map((c) => c.key);
    expect(activeKeys).toContain("status");
    expect(activeKeys).not.toContain("name");
    expect(activeKeys).not.toContain("email");
  });

  it("respects savedLayout when provided", () => {
    const savedLayout = {
      columns: [
        { key: "status", visible: true },
        { key: "name", visible: false },
        { key: "email", visible: true },
      ],
    };

    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        savedLayout,
        schemaReady: true,
      }),
    );

    const activeKeys = result.current.activeColumns.map((c) => c.key);
    expect(activeKeys).toContain("status");
    expect(activeKeys).toContain("email");
    expect(activeKeys).not.toContain("name");
  });

  it("adds new columns not present in savedLayout", () => {
    const savedLayout = {
      columns: [
        { key: "name", visible: true },
      ],
    };

    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        savedLayout,
        schemaReady: true,
      }),
    );

    // email and status should be appended with their defaults
    expect(result.current.columnOrder).toHaveLength(3);
    const emailEntry = result.current.columnOrder.find((c) => c.key === "email");
    expect(emailEntry?.visible).toBe(true);
    const statusEntry = result.current.columnOrder.find((c) => c.key === "status");
    expect(statusEntry?.visible).toBe(false);
  });

  it("calls onLayoutChange when toggling a column", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
        onLayoutChange,
      }),
    );

    act(() => result.current.chooser.toggleColumn("status"));
    expect(onLayoutChange).toHaveBeenCalledWith({
      columns: expect.arrayContaining([
        expect.objectContaining({ key: "status", visible: true }),
      ]),
    });
  });

  it("calls onLayoutChange when setAllVisible is used", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
        onLayoutChange,
      }),
    );

    act(() => result.current.chooser.setAllVisible(true));
    expect(onLayoutChange).toHaveBeenCalledWith({
      columns: expect.arrayContaining([
        expect.objectContaining({ key: "status", visible: true }),
      ]),
    });
  });

  it("calls onLayoutChange when invertColumns is used", () => {
    const onLayoutChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        schemaReady: true,
        onLayoutChange,
      }),
    );

    act(() => result.current.chooser.invertColumns());
    expect(onLayoutChange).toHaveBeenCalled();
  });

  describe("drag and drop", () => {
    it("handleDragStart sets the drag source", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      act(() => result.current.chooser.handleDragStart("email"));
      // No observable state change until drop, but we verify it doesn't throw
      expect(result.current.chooser.dragOverCol).toBe(null);
    });

    it("handleDragOver sets dragOverCol", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      act(() => result.current.chooser.handleDragStart("email"));
      act(() => {
        const mockEvent = { preventDefault: vi.fn() } as unknown as React.DragEvent;
        result.current.chooser.handleDragOver(mockEvent, "status");
      });
      expect(result.current.chooser.dragOverCol).toBe("status");
    });

    it("handleDrop reorders columns", () => {
      const onLayoutChange = vi.fn();
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
          onLayoutChange,
        }),
      );

      // Initially: name, email, status
      expect(result.current.columnOrder.map((c) => c.key)).toEqual(["name", "email", "status"]);

      act(() => result.current.chooser.handleDragStart("email"));
      act(() => result.current.chooser.handleDrop("name"));

      // email should now be before name
      const keys = result.current.columnOrder.map((c) => c.key);
      expect(keys.indexOf("email")).toBeLessThan(keys.indexOf("name"));
      expect(onLayoutChange).toHaveBeenCalled();
    });

    it("handleDrop does nothing when source equals target", () => {
      const onLayoutChange = vi.fn();
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
          onLayoutChange,
        }),
      );

      act(() => result.current.chooser.handleDragStart("email"));
      act(() => result.current.chooser.handleDrop("email"));

      expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("handleDrop does nothing when no source is set", () => {
      const onLayoutChange = vi.fn();
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
          onLayoutChange,
        }),
      );

      act(() => result.current.chooser.handleDrop("email"));
      expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it("handleDragEnd clears drag state", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      act(() => result.current.chooser.handleDragStart("email"));
      act(() => {
        const mockEvent = { preventDefault: vi.fn() } as unknown as React.DragEvent;
        result.current.chooser.handleDragOver(mockEvent, "status");
      });
      expect(result.current.chooser.dragOverCol).toBe("status");

      act(() => result.current.chooser.handleDragEnd());
      expect(result.current.chooser.dragOverCol).toBe(null);
    });
  });

  describe("openChooser", () => {
    it("opens the chooser panel", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      expect(result.current.chooser.open).toBe(false);
      act(() => result.current.chooser.openChooser());
      expect(result.current.chooser.open).toBe(true);
    });

    it("toggles the chooser closed if already open", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      act(() => result.current.chooser.openChooser());
      expect(result.current.chooser.open).toBe(true);

      act(() => result.current.chooser.openChooser());
      expect(result.current.chooser.open).toBe(false);
    });

    it("resets search when opening", () => {
      const { result } = renderHook(() =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: true,
        }),
      );

      act(() => result.current.chooser.setSearch("test"));
      act(() => result.current.chooser.openChooser());
      expect(result.current.chooser.search).toBe("");
    });
  });

  it("rebuilds order from default when schemaReady changes and no saved layout", () => {
    const { result, rerender } = renderHook(
      ({ ready }: { ready: boolean }) =>
        useColumnChooser({
          columns: testColumns,
          schemaReady: ready,
        }),
      { initialProps: { ready: false } },
    );

    const initialOrder = result.current.columnOrder;
    rerender({ ready: true });
    // Should still have same structure but re-built
    expect(result.current.columnOrder).toHaveLength(initialOrder.length);
  });

  it("filters out unknown keys from savedLayout", () => {
    const savedLayout = {
      columns: [
        { key: "unknown-col", visible: true },
        { key: "name", visible: true },
      ],
    };

    const { result } = renderHook(() =>
      useColumnChooser({
        columns: testColumns,
        savedLayout,
        schemaReady: true,
      }),
    );

    // unknown-col should be filtered out
    const keys = result.current.columnOrder.map((c) => c.key);
    expect(keys).not.toContain("unknown-col");
    expect(keys).toContain("name");
    expect(keys).toContain("email");
    expect(keys).toContain("status");
  });
});
