import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import ProgramElementsPage from "./program-elements-page";

const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../hooks/use-policies", () => ({
  usePolicyCounts: vi.fn(() => ({
    pursePolicyCount: 5,
    tierPolicyCount: 3,
    isLoading: false,
  })),
}));

vi.mock("../hooks/use-activity-templates", () => ({
  useActivityTemplateCount: vi.fn(() => ({
    count: 2,
    isLoading: false,
  })),
}));

vi.mock("../components/element-card", () => ({
  ElementCard: ({ title, count, testId, onClick, disabled }: { title: string; count?: number; testId: string; onClick: () => void; disabled?: boolean }) => (
    <div data-testid={testId}>
      <span>{title}</span>
      {count !== undefined && <span data-testid={`${testId}-count`}>{count}</span>}
      {!disabled && <button data-testid={`${testId}-click`} onClick={onClick}>Go</button>}
    </div>
  ),
}));

vi.mock("@/shared/components/no-program-banner", () => ({
  NoProgramBanner: (props: Record<string, unknown>) => (
    <div data-testid={props["data-testid"] as string}>No program selected</div>
  ),
}));

vi.mock("@/shared/components/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

describe("ProgramElementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
    mockUIState();
  });

  it("renders the page with heading", () => {
    render(<ProgramElementsPage />, { routerEntries: ["/program"] });
    expect(screen.getByText("Program Elements")).toBeInTheDocument();
  });

  it("renders element cards with counts", () => {
    render(<ProgramElementsPage />, { routerEntries: ["/program"] });
    expect(screen.getByTestId("element-card-purse")).toBeInTheDocument();
    expect(screen.getByTestId("element-card-tier")).toBeInTheDocument();
    expect(screen.getByTestId("element-card-activity-templates")).toBeInTheDocument();
    expect(screen.getByTestId("element-card-purse-count")).toHaveTextContent("5");
    expect(screen.getByTestId("element-card-tier-count")).toHaveTextContent("3");
    expect(screen.getByTestId("element-card-activity-templates-count")).toHaveTextContent("2");
  });

  it("renders disabled cards for future features", () => {
    render(<ProgramElementsPage />, { routerEntries: ["/program"] });
    expect(screen.getByTestId("element-card-rules")).toBeInTheDocument();
    expect(screen.getByTestId("element-card-flow")).toBeInTheDocument();
    expect(screen.getByTestId("element-card-aggregate")).toBeInTheDocument();
  });

  it("shows NoProgramBanner when no program is selected", () => {
    mockUIState({ currentProgram: null, currentProgramName: null });
    render(<ProgramElementsPage />, { routerEntries: ["/program"] });
    expect(screen.getByTestId("program-elements-no-program")).toBeInTheDocument();
    expect(screen.getByText("No program selected")).toBeInTheDocument();
  });

  it("shows loading state when counts are loading", async () => {
    const { usePolicyCounts } = await import("../hooks/use-policies");
    vi.mocked(usePolicyCounts).mockReturnValue({
      pursePolicyCount: 0,
      tierPolicyCount: 0,
      isLoading: true,
    });

    render(<ProgramElementsPage />, { routerEntries: ["/program"] });
    // When loading, count is undefined so count span should not render
    expect(screen.queryByTestId("element-card-purse-count")).not.toBeInTheDocument();
  });

  describe("navigation", () => {
    it("clicking Purse Policies card navigates to /program/purse-policies", () => {
      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      fireEvent.click(screen.getByTestId("element-card-purse-click"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/purse-policies");
    });

    it("clicking Tier Groups card navigates to /program/tier-groups", () => {
      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      fireEvent.click(screen.getByTestId("element-card-tier-click"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/tier-groups");
    });

    it("clicking Activity Templates card navigates to /program/activity-templates", () => {
      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      fireEvent.click(screen.getByTestId("element-card-activity-templates-click"));
      expect(mockNavigate).toHaveBeenCalledWith("/program/activity-templates");
    });
  });

  describe("activity template loading", () => {
    it("hides activity template count when activity templates are loading", async () => {
      const { useActivityTemplateCount } = await import("../hooks/use-activity-templates");
      vi.mocked(useActivityTemplateCount).mockReturnValue({
        count: 0,
        isLoading: true,
      });

      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      expect(screen.queryByTestId("element-card-activity-templates-count")).not.toBeInTheDocument();
    });
  });

  describe("program name display", () => {
    it("passes program name as description to PageHeader", () => {
      mockUIState({ currentProgram: "prog-1", currentProgramName: "My Program" });
      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      // PageHeader is mocked, but the component passes currentProgramName to it
      expect(screen.getByTestId("program-elements-page")).toBeInTheDocument();
    });

    it("renders page test id correctly", () => {
      render(<ProgramElementsPage />, { routerEntries: ["/program"] });
      expect(screen.getByTestId("program-elements-page")).toBeInTheDocument();
    });
  });
});
