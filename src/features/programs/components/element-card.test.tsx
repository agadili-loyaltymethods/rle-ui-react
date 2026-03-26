import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { ElementCard } from "./element-card";

function StubIcon({ className }: { className?: string }) {
  return <svg className={className} data-testid="stub-icon" />;
}

describe("ElementCard", () => {
  it("renders with minimal props", () => {
    render(
      <ElementCard
        icon={StubIcon}
        title="Test Title"
        description="Test description"
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders count badge when count is provided", () => {
    render(
      <ElementCard
        icon={StubIcon}
        title="Purses"
        description="Purse policies"
        count={42}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(
      <ElementCard
        icon={StubIcon}
        title="Coming"
        description="Not yet"
        onClick={vi.fn()}
        disabled
      />,
    );
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});
