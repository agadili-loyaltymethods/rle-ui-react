import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryClient } from "./query-client";

describe("queryClient", () => {
  it("is defined", () => {
    expect(queryClient).toBeDefined();
  });

  it("is an instance of QueryClient", () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it("has expected default query options", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });
});
