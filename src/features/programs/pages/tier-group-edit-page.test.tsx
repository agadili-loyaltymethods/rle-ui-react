import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import TierGroupEditPage from "./tier-group-edit-page";

// Mock EntityEditPage since TierGroupEditPage is a thin wrapper
vi.mock("@/shared/components/entity-edit-page", () => ({
  EntityEditPage: (props: Record<string, unknown>) => (
    <div data-testid="entity-edit-page" data-config={JSON.stringify(props.config ? "present" : "missing")}>
      EntityEditPage
    </div>
  ),
}));

vi.mock("../hooks/use-policies", () => ({
  useCreateTierPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateTierPolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("../config/tier-policy-config", () => ({
  tierPolicyEditConfig: {
    entityName: "Tier Policy",
    endpoint: "tierpolicies",
  },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useNavigate: vi.fn(() => vi.fn()),
    useBlocker: vi.fn(() => ({ state: "unblocked", reset: vi.fn() })),
  };
});

describe("TierGroupEditPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockUIState();
  });

  it("exports a default component", () => {
    expect(typeof TierGroupEditPage).toBe("function");
  });

  it("renders EntityEditPage with config", () => {
    render(<TierGroupEditPage />, { routerEntries: ["/program/tier-groups/new"] });
    expect(screen.getByTestId("entity-edit-page")).toBeInTheDocument();
    expect(screen.getByText("EntityEditPage")).toBeInTheDocument();
  });
});
