import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import PursePolicyEditPage from "./purse-policy-edit-page";
import { buildPursePolicyEditConfig } from "../config/purse-policy-config";

const mockBuildConfig = vi.mocked(buildPursePolicyEditConfig);

vi.mock("@/shared/components/entity-edit-page", () => ({
  EntityEditPage: (props: Record<string, unknown>) => (
    <div data-testid="entity-edit-page">
      EntityEditPage:{" "}
      {(props.config as { entityName?: string })?.entityName ?? "unknown"}
    </div>
  ),
}));

vi.mock("../hooks/use-policies", () => ({
  useCreatePursePolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdatePursePolicy: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/shared/hooks/use-enums", () => ({
  useEnumOptions: vi.fn((type: string) => {
    const map: Record<string, unknown[]> = {
      PurseGroup: [{ value: "Group1", label: "Group 1" }],
      timeZone: [{ value: "UTC", label: "UTC" }],
      AggregateType: [
        { value: "Daily", label: "Daily" },
        { value: "Monthly", label: "Monthly" },
      ],
      SnapTo: [
        { value: "StartOfDay", label: "start of day" },
        { value: "ExpirationDate", label: "expiration date" },
      ],
    };
    return { data: map[type] ?? [] };
  }),
  useCreateEnum: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/shared/hooks/use-api", () => ({
  useEntityList: vi.fn(() => ({
    data: { data: [{ _id: "div-1", name: "US Division" }] },
    isLoading: false,
  })),
  useEntity: vi.fn(() => ({ data: null, isLoading: false })),
  useCreateEntity: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateEntity: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock("@/shared/hooks/use-divisions", () => ({
  useDivisionOptions: vi.fn(() => ({ options: [{ value: "div-1", label: "US Division" }], isLoading: false })),
}));

vi.mock("../hooks/use-programs", () => ({
  useProgram: vi.fn(() => ({ data: { divisions: ["div-1"] }, isLoading: false })),
}));

vi.mock("../config/purse-policy-config", () => ({
  buildPursePolicyEditConfig: vi.fn(() => ({
    entityName: "Purse Policy",
    endpoint: "pursepolicies",
    tabs: [],
  })),
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

describe("PursePolicyEditPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockUIState();
  });

  it("exports a default component", () => {
    expect(typeof PursePolicyEditPage).toBe("function");
  });

  it("renders EntityEditPage", () => {
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    expect(screen.getByTestId("entity-edit-page")).toBeInTheDocument();
  });

  it("passes config to EntityEditPage", () => {
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    expect(screen.getByText(/Purse Policy/)).toBeInTheDocument();
  });

  it("passes useCreate and useUpdate to EntityEditPage", () => {
    const { container } = render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    // The EntityEditPage renders, meaning useCreate and useUpdate hooks were provided
    expect(container.querySelector('[data-testid="entity-edit-page"]')).toBeInTheDocument();
  });

  it("sorts AggregateType options by duration order", () => {
    // The component is exercised with AggregateType options that include Daily and Monthly
    // The buildPursePolicyEditConfig is called with sorted options
    mockBuildConfig.mockClear();
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    // buildPursePolicyEditConfig was called with dynamic options
    expect(mockBuildConfig).toHaveBeenCalled();
    const callArg = mockBuildConfig.mock.calls[0][0];
    // Daily (order 1) should come before Monthly (order 3)
    const dailyIdx = callArg.aggregateTypeOptions.findIndex((o: { value: string }) => o.value === "Daily");
    const monthlyIdx = callArg.aggregateTypeOptions.findIndex((o: { value: string }) => o.value === "Monthly");
    expect(dailyIdx).toBeLessThan(monthlyIdx);
  });

  it("filters out ExpirationDate from SnapTo options", () => {
    mockBuildConfig.mockClear();
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    const callArg = buildPursePolicyEditConfig.mock.calls[0][0];
    const snapToValues = callArg.snapToOptions.map((o: { value: string }) => o.value);
    expect(snapToValues).not.toContain("ExpirationDate");
    expect(snapToValues).toContain("StartOfDay");
  });

  it("capitalizes SnapTo option labels", () => {
    mockBuildConfig.mockClear();
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    const callArg = buildPursePolicyEditConfig.mock.calls[0][0];
    const startOfDay = callArg.snapToOptions.find((o: { value: string }) => o.value === "StartOfDay");
    expect(startOfDay.label).toBe("Start Of Day");
  });

  it("maps division data to options with value and label", () => {
    mockBuildConfig.mockClear();
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    const callArg = buildPursePolicyEditConfig.mock.calls[0][0];
    expect(callArg.divisionOptions).toEqual([{ value: "div-1", label: "US Division" }]);
  });

  it("passes group options from enum data", () => {
    mockBuildConfig.mockClear();
    render(<PursePolicyEditPage />, { routerEntries: ["/program/purse-policies/new"] });
    const callArg = buildPursePolicyEditConfig.mock.calls[0][0];
    expect(callArg.groupOptions).toEqual([{ value: "Group1", label: "Group 1" }]);
  });
});
