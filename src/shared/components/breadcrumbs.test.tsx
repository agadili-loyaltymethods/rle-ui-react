import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { BreadcrumbProvider } from "./breadcrumb-context";
import { Breadcrumbs } from "./breadcrumbs";

describe("Breadcrumbs", () => {
  it("renders without crashing", () => {
    render(
      <BreadcrumbProvider>
        <Breadcrumbs />
      </BreadcrumbProvider>,
      { routerEntries: ["/programs"] },
    );
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
  });

  it("returns null when at root path", () => {
    const { container } = render(
      <BreadcrumbProvider>
        <Breadcrumbs />
      </BreadcrumbProvider>,
      { routerEntries: ["/"] },
    );
    expect(container.querySelector("nav")).toBeNull();
  });
});
