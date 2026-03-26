import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook, act } from "@/test-utils";
import * as React from "react";
import { BreadcrumbProvider, useBreadcrumbOverride, useBreadcrumbOverrides } from "./breadcrumb-context";

describe("BreadcrumbProvider", () => {
  it("renders children without crashing", () => {
    render(
      <BreadcrumbProvider>
        <span data-testid="child">hello</span>
      </BreadcrumbProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

describe("useBreadcrumbOverrides", () => {
  it("returns empty overrides by default", () => {
    const { result } = renderHook(() => useBreadcrumbOverrides(), {
      wrapper: BreadcrumbProvider,
    });
    expect(result.current).toEqual({});
  });
});

describe("useBreadcrumbOverride", () => {
  it("registers an override for a segment", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar() {
      useBreadcrumbOverride("abc123", "Gold Points");
      return null;
    }

    render(
      <BreadcrumbProvider>
        <TestRegistrar />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      abc123: "Gold Points",
    });
  });

  it("unregisters override on unmount", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar() {
      useBreadcrumbOverride("seg1", "Label One");
      return null;
    }

    const { unmount } = render(
      <BreadcrumbProvider>
        <TestRegistrar />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      seg1: "Label One",
    });

    // Re-render without the registrar to trigger unmount cleanup
    unmount();
  });

  it("supports multiple overrides from different hooks", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function Registrar1() {
      useBreadcrumbOverride("id1", "First");
      return null;
    }
    function Registrar2() {
      useBreadcrumbOverride("id2", "Second");
      return null;
    }

    render(
      <BreadcrumbProvider>
        <Registrar1 />
        <Registrar2 />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    const overrides = JSON.parse(screen.getByTestId("overrides").textContent!);
    expect(overrides).toEqual({ id1: "First", id2: "Second" });
  });

  it("does not register when segment is undefined", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar() {
      useBreadcrumbOverride(undefined, "Label");
      return null;
    }

    render(
      <BreadcrumbProvider>
        <TestRegistrar />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({});
  });

  it("does not register when label is undefined", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar() {
      useBreadcrumbOverride("seg1", undefined);
      return null;
    }

    render(
      <BreadcrumbProvider>
        <TestRegistrar />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({});
  });

  it("removes only the specified override, leaving others intact", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function Registrar1() {
      useBreadcrumbOverride("id1", "First");
      return null;
    }
    function Registrar2({ active }: { active: boolean }) {
      useBreadcrumbOverride(active ? "id2" : undefined, active ? "Second" : undefined);
      return null;
    }

    const { rerender } = render(
      <BreadcrumbProvider>
        <Registrar1 />
        <Registrar2 active={true} />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      id1: "First",
      id2: "Second",
    });

    rerender(
      <BreadcrumbProvider>
        <Registrar1 />
        <Registrar2 active={false} />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    // id2 should be cleaned up, id1 remains
    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toHaveProperty("id1", "First");
  });

  it("cleans up override on unmount via effect cleanup", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar() {
      useBreadcrumbOverride("unmount-seg", "Will Remove");
      return null;
    }

    // Mount both
    const { rerender } = render(
      <BreadcrumbProvider>
        <TestRegistrar />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      "unmount-seg": "Will Remove",
    });

    // Re-render without TestRegistrar to trigger its unmount cleanup (removeOverride)
    rerender(
      <BreadcrumbProvider>
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({});
  });

  it("updates override when label changes for the same segment", () => {
    function TestConsumer() {
      const overrides = useBreadcrumbOverrides();
      return <pre data-testid="overrides">{JSON.stringify(overrides)}</pre>;
    }
    function TestRegistrar({ label }: { label: string }) {
      useBreadcrumbOverride("seg-update", label);
      return null;
    }

    const { rerender } = render(
      <BreadcrumbProvider>
        <TestRegistrar label="Original" />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      "seg-update": "Original",
    });

    rerender(
      <BreadcrumbProvider>
        <TestRegistrar label="Updated" />
        <TestConsumer />
      </BreadcrumbProvider>,
    );

    expect(JSON.parse(screen.getByTestId("overrides").textContent!)).toEqual({
      "seg-update": "Updated",
    });
  });
});
