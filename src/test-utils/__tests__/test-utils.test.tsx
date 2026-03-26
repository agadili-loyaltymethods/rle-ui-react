import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { render, screen, createWrapper } from "@/test-utils";
import { renderHook, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";

describe("test-utils", () => {
  describe("render", () => {
    it("renders a component with QueryClientProvider", () => {
      function TestComponent() {
        return createElement("div", { "data-testid": "test" }, "Hello");
      }

      render(createElement(TestComponent));
      expect(screen.getByTestId("test")).toHaveTextContent("Hello");
    });

    it("provides a queryClient on the return value", () => {
      function TestComponent() {
        return createElement("div", null, "test");
      }

      const { queryClient } = render(createElement(TestComponent));
      expect(queryClient).toBeDefined();
      expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    });
  });

  describe("createWrapper", () => {
    it("can be used with renderHook", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ["test"],
            queryFn: () => Promise.resolve(42),
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(42);
    });
  });
});
