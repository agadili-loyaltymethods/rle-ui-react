import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import EnumerationsPage from "./enums-page";

vi.mock("@/shared/hooks/use-user-meta", () => ({
  useUserExtLoader: vi.fn(() => true),
}));

vi.mock("../../shared/hooks/use-entity-schema", () => ({
  useEntitySchema: vi.fn(() => ({ fields: [], isLoading: false })),
}));

vi.mock("../../shared/hooks/use-server-table", () => ({
  useServerTable: vi.fn(() => ({
    data: [],
    totalCount: 0,
    isLoading: false,
    isFetching: false,
    pagination: { pageIndex: 0, pageSize: 25 },
    setPagination: vi.fn(),
    sorting: [],
    setSorting: vi.fn(),
    refetch: vi.fn(),
  })),
}));

vi.mock("../../shared/hooks/use-bulk-operations", () => ({
  useBulkOperations: vi.fn(() => ({
    selectedIds: new Set(),
    toggleSelection: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    deleteSelected: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("../../shared/lib/build-columns", () => ({
  buildColumns: vi.fn(() => []),
}));

vi.mock("../../shared/components/server-table-page", () => ({
  ServerTablePage: Object.assign(
    (props: Record<string, unknown>) => (
      <div data-testid="server-table-page">
        <h1>{(props.config as { pageTitle?: string })?.pageTitle ?? "Enumerations"}</h1>
      </div>
    ),
    {
      Skeleton: ({ config }: { config: { pageTitle?: string } }) => (
        <div data-testid="server-table-skeleton">{config.pageTitle} loading...</div>
      ),
    },
  ),
}));

vi.mock("../../shared/hooks/use-entity-preferences", () => ({
  useEntityPreferences: vi.fn(() => ({
    saveTableLayout: vi.fn(),
    saveFormTabOrder: vi.fn(),
  })),
  getSavedEntityTableLayout: vi.fn(() => null),
  getSavedEntityFormTabOrder: vi.fn(() => undefined),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: vi.fn(() => ({})),
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

describe("EnumerationsPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockUIState();
  });

  it("exports a default component", () => {
    expect(typeof EnumerationsPage).toBe("function");
  });

  it("renders the server table page", () => {
    render(<EnumerationsPage />, { routerEntries: ["/reference-data/enums"] });
    expect(screen.getByTestId("server-table-page")).toBeInTheDocument();
  });

  it("shows skeleton when ext is not loaded", async () => {
    const { useUserExtLoader } = await import("@/shared/hooks/use-user-meta");
    vi.mocked(useUserExtLoader).mockReturnValue(false);

    render(<EnumerationsPage />, { routerEntries: ["/reference-data/enums"] });
    expect(screen.getByTestId("server-table-skeleton")).toBeInTheDocument();

    vi.mocked(useUserExtLoader).mockReturnValue(true);
  });
});
