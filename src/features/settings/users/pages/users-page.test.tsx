import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, mockAuthenticatedUser, mockUIState } from "@/test-utils";
import UsersPage from "./users-page";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockRefetch = vi.fn();
const mockClearSelection = vi.fn();

vi.mock("@/shared/hooks/use-permissions", () => ({
  usePermissions: () => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    isLoading: false,
  }),
}));

vi.mock("@/shared/hooks/use-user-meta", () => ({
  useUserExtLoader: vi.fn(() => true),
}));

vi.mock("@/features/reference-data/shared/hooks/use-entity-schema", () => ({
  useEntitySchema: vi.fn(() => ({
    extFields: {},
    categories: [],
    enumFields: {},
    isLoading: false,
    error: null,
    dbSchema: {},
    extSchemaPartial: false,
  })),
}));

vi.mock("@/features/reference-data/shared/hooks/use-server-table", () => ({
  useServerTable: vi.fn(() => ({
    data: [],
    totalCount: 0,
    isLoading: false,
    isFetching: false,
    error: null,
    pageIndex: 0,
    pageSize: 25,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    sorting: [],
    onSortChange: vi.fn(),
    searchQuery: "",
    onSearchChange: vi.fn(),
    columnFilters: [],
    onFilterChange: vi.fn(),
    selectedIds: new Set(),
    onRowSelect: vi.fn(),
    clearSelection: mockClearSelection,
    selectAll: vi.fn(),
    selectingAll: false,
    invertSelection: vi.fn(),
    refetch: mockRefetch,
  })),
}));

vi.mock("@/features/reference-data/shared/hooks/use-bulk-operations", () => ({
  useBulkOperations: vi.fn(() => ({
    bulkUpdate: { mutateAsync: vi.fn(), isPending: false },
    bulkDelete: { mutateAsync: vi.fn(), isPending: false },
  })),
}));

vi.mock("@/features/reference-data/shared/lib/build-columns", () => ({
  buildColumns: vi.fn(() => []),
}));

let serverTablePageProps: Record<string, unknown> = {};

vi.mock("@/features/reference-data/shared/components/server-table-page", () => ({
  ServerTablePage: Object.assign(
    (props: Record<string, unknown>) => {
      serverTablePageProps = props;
      const config = props.config as { pageTitle?: string; testIdPrefix?: string };
      return (
        <div data-testid="server-table-page">
          <h1>{config?.pageTitle ?? "Users"}</h1>
          <span data-testid="stp-endpoint">
            {(props.config as { endpoint?: string })?.endpoint}
          </span>
          <span data-testid="stp-model">
            {(props.config as { modelName?: string })?.modelName}
          </span>
        </div>
      );
    },
    {
      Skeleton: ({ config }: { config: { pageTitle?: string } }) => (
        <div data-testid="server-table-skeleton">{config.pageTitle} loading...</div>
      ),
    },
  ),
}));

vi.mock("@/features/reference-data/shared/hooks/use-entity-preferences", () => ({
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

// ── Tests ───────────────────────────────────────────────────────────────────

describe("UsersPage", () => {
  beforeEach(() => {
    mockAuthenticatedUser();
    mockUIState();
    serverTablePageProps = {};
    vi.clearAllMocks();
  });

  // ── Basic rendering ───────────────────────────────────────────────────

  it("exports a default component", () => {
    expect(typeof UsersPage).toBe("function");
  });

  it("renders the server table page", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(screen.getByTestId("server-table-page")).toBeInTheDocument();
  });

  it("passes Users as page title", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Users");
  });

  it("shows skeleton when ext is not loaded", async () => {
    const { useUserExtLoader } = await import("@/shared/hooks/use-user-meta");
    vi.mocked(useUserExtLoader).mockReturnValue(false);

    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(screen.getByTestId("server-table-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("server-table-page")).not.toBeInTheDocument();

    vi.mocked(useUserExtLoader).mockReturnValue(true);
  });

  // ── Config ────────────────────────────────────────────────────────────

  it("passes the correct endpoint to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(screen.getByTestId("stp-endpoint")).toHaveTextContent("users");
  });

  it("passes the correct modelName to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(screen.getByTestId("stp-model")).toHaveTextContent("User");
  });

  it("passes schema prop to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.schema).toBeDefined();
    expect((serverTablePageProps.schema as { isLoading: boolean }).isLoading).toBe(false);
  });

  it("passes table prop to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.table).toBeDefined();
    expect((serverTablePageProps.table as { data: unknown[] }).data).toEqual([]);
  });

  it("passes bulkOps prop to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.bulkOps).toBeDefined();
  });

  it("passes columns prop to ServerTablePage", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.columns).toBeDefined();
    expect(Array.isArray(serverTablePageProps.columns)).toBe(true);
  });

  // ── Layout and preferences ────────────────────────────────────────────

  it("passes savedLayout as null initially", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.savedLayout).toBeNull();
  });

  it("passes onLayoutChange callback", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(typeof serverTablePageProps.onLayoutChange).toBe("function");
  });

  it("passes savedTabOrder as undefined initially", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(serverTablePageProps.savedTabOrder).toBeUndefined();
  });

  it("passes onTabOrderChange callback", () => {
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(typeof serverTablePageProps.onTabOrderChange).toBe("function");
  });

  // ── Entity schema wiring ──────────────────────────────────────────────

  it("calls useEntitySchema with 'User' model name", async () => {
    const { useEntitySchema } = await import(
      "@/features/reference-data/shared/hooks/use-entity-schema"
    );
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(useEntitySchema).toHaveBeenCalledWith("User", expect.objectContaining({
      modelName: "User",
      endpoint: "users",
    }));
  });

  it("calls useServerTable with userConfig", async () => {
    const { useServerTable } = await import(
      "@/features/reference-data/shared/hooks/use-server-table"
    );
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(useServerTable).toHaveBeenCalledWith(expect.objectContaining({
      modelName: "User",
      endpoint: "users",
      defaultSort: "login",
    }));
  });

  it("calls useBulkOperations with userConfig", async () => {
    const { useBulkOperations } = await import(
      "@/features/reference-data/shared/hooks/use-bulk-operations"
    );
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(useBulkOperations).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: "users",
    }));
  });

  it("calls useEntityPreferences with 'user'", async () => {
    const { useEntityPreferences } = await import(
      "@/features/reference-data/shared/hooks/use-entity-preferences"
    );
    render(<UsersPage />, { routerEntries: ["/settings/users"] });
    expect(useEntityPreferences).toHaveBeenCalledWith("user");
  });
});
