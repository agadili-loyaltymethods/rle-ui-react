import { describe, it, expect, vi } from "vitest";

vi.mock("../hooks/use-audit-logs", () => ({
  useAuditLogTable: () => ({
    data: [],
    totalCount: 0,
    pageIndex: 0,
    pageSize: 25,
    isLoading: false,
    isFetching: false,
    error: null,
    searchQuery: "",
    onSearchChange: vi.fn(),
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    sorting: [],
    onSortChange: vi.fn(),
    columnFilters: [],
    onFilterChange: vi.fn(),
    refetch: vi.fn(),
    filters: {
      entityType: "",
      action: "",
      source: "",
      dateFrom: "",
      dateTo: "",
      batchId: "",
    },
    setFilter: vi.fn(),
    clearAllFilters: vi.fn(),
    filterByBatch: vi.fn(),
  }),
}));

vi.mock("@/shared/components/server-table", () => ({
  ServerTable: ({ emptyMessage }: { emptyMessage?: string }) => (
    <div data-testid="mock-server-table">{emptyMessage}</div>
  ),
}));

vi.mock("@/shared/components/table-pagination", () => ({
  TablePagination: () => <div data-testid="mock-pagination" />,
}));

vi.mock("@/shared/components/column-chooser-dropdown", () => ({
  ColumnChooserDropdown: () => null,
}));

vi.mock("@/shared/hooks/use-column-chooser", () => ({
  useColumnChooser: () => ({
    columnOrder: [],
    activeColumns: [],
    chooser: {
      open: false,
      search: "",
      setSearch: vi.fn(),
      pos: null,
      panelRef: { current: null },
      btnRef: { current: null },
      searchRef: { current: null },
      dragOverCol: null,
      openChooser: vi.fn(),
      toggleColumn: vi.fn(),
      setAllVisible: vi.fn(),
      invertColumns: vi.fn(),
      handleDragStart: vi.fn(),
      handleDragOver: vi.fn(),
      handleDrop: vi.fn(),
      handleDragEnd: vi.fn(),
    },
  }),
}));

vi.mock("../components/audit-log-detail-drawer", () => ({
  AuditLogDetailDrawer: () => null,
}));

import { render, screen } from "@/test-utils";
import AuditLogsPage from "./audit-logs-page";

describe("AuditLogsPage", () => {
  it("renders the page with correct test id", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByTestId("page-audit-logs")).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "auditLogs.title",
    );
  });

  it("renders the search bar", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByTestId("audit-logs-search-input")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByTestId("audit-logs-refresh")).toBeInTheDocument();
  });

  it("renders the filter toolbar", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByTestId("audit-filter-entity-type-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-action-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-source-trigger")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.getByText("auditLogs.emptyMessage")).toBeInTheDocument();
  });

  it("does not show batch filter indicator when batchId is empty", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(
      screen.queryByText(/Showing entries for batch/),
    ).not.toBeInTheDocument();
  });

  it("does not show error banner when there is no error", () => {
    render(<AuditLogsPage />, { routerEntries: ["/audit-logs"] });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
