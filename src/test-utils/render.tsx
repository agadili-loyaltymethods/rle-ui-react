import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createElement, type ReactElement, type ReactNode } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route entries for MemoryRouter. If provided, wraps in MemoryRouter. */
  routerEntries?: string[];
}

function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { routerEntries, ...renderOptions } = options ?? {};
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    const withQuery = createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
    if (routerEntries) {
      return createElement(
        MemoryRouter,
        { initialEntries: routerEntries },
        withQuery,
      );
    }
    return withQuery;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

export { customRender as render };
